
const express = require("express");
const prisma = require("../config/prismaClient");
const { PaymentStatus } = require("@prisma/client");
const { getPaymentQueue } = require("../config/paymentQueue");
const {
  validateCallbackSecurityMiddleware,
  verifyPaymentWithMpesa
} = require("../middleware/mpesaCallbackSecurityMiddleware");
const { validateCallbackStructure } = require("../validators/paymentValidator");
// AUTH-11 FIX: paymentLimiter removed from this file — it was causing Safaricom
// retry callbacks to be rejected with 429. The IP whitelist in
// validateCallbackSecurityMiddleware + BullMQ jobId idempotency are sufficient.
const { logAudit } = require("../utils/auditLogger");
const { sendPaymentStatus } = require("../services/websocket");
// BOOT-5 FIX: Use the shared Redis singletons instead of creating private connections.
// getRedisClient()       — Queue producers (maxRetriesPerRequest: 3, non-blocking)
// getWorkerRedisClient() — BullMQ Workers (maxRetriesPerRequest: null, required by BullMQ)
const { getRedisClient, getWorkerRedisClient } = require("../config/redis");

const router = express.Router();

router.post(
  "/mpesa/callback",
  // AUTH-11 FIX: paymentLimiter intentionally removed — Safaricom retries from the
  // same IP range would be rejected with 429. Security is handled by the IP whitelist
  // in validateCallbackSecurityMiddleware and job idempotency via BullMQ jobId.
  validateCallbackSecurityMiddleware,
  async (req, res) => {
    // CRIT-4 FIX: Validate callback structure BEFORE sending 200.
    // Previously we sent 200 first, then silently discarded invalid payloads after the
    // fact. A malformed-but-IP-whitelisted request would get 200 and no retries, making
    // the discard completely invisible.
    // Fix: validate first. If invalid, return 400 so Safaricom retries. Only once we
    // know the structure is correct do we send 200 and hand off to async processing.
    const structureValidation = validateCallbackStructure(req.body);
    if (!structureValidation.valid) {
      console.error("❌ Invalid callback structure:", structureValidation.errors);
      logAudit('callback_invalid_structure', {
        errors: structureValidation.errors,
        ip: req.callbackSecurity.clientIP
      });
      // 400 causes Safaricom to retry — correct behaviour for a malformed payload.
      return res.status(400).json({ success: false, error: 'Invalid callback structure' });
    }

    // Extract validated fields (safe after structure check)
    const callbackData = req.body.Body.stkCallback;
    const checkoutId = callbackData.CheckoutRequestID;
    console.log(`📥 Callback received: ${checkoutId}`);

    // Immediate acknowledgment to prevent M-Pesa retries on valid callbacks.
    // All further processing happens asynchronously below.
    res.status(200).json({ success: true });

    try {
      // Enqueue payment processing job
      // idempotency: jobId ensures only one job per checkoutId
      const queue = getPaymentQueue();
      if (queue) {
        try {
          await queue.add(
            'process-payment-secure',
            {
              checkoutId,
              callbackData,
              callbackSecurity: req.callbackSecurity
            },
            {
              jobId: checkoutId, // Idempotency key
              removeOnComplete: true,
              removeOnFail: false, // Keep failed jobs for debugging
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000
              }
            }
          );

          console.log(`✅ Payment job enqueued: ${checkoutId}`);
          logAudit('callback_enqueued', { checkoutId, ip: req.callbackSecurity.clientIP });
        } catch (error) {
          // Job may already exist if duplicate callback
          if (error.message.includes('already exists')) {
            console.log(`ℹ️ Duplicate callback: ${checkoutId} (already enqueued)`);
            return;
          }

          console.error('❌ Failed to enqueue payment job:', error.message);
          logAudit('callback_enqueue_failed', { checkoutId, error: error.message });
        }
      } else {
        // CRIT-2 FIX: Redis/queue unavailable — process the payment INLINE rather
        // than silently dropping it. Uses the same processPaymentJob() logic as the
        // BullMQ worker so the behaviour is identical. Safaricom already received
        // a 200 above, so this runs fire-and-forget to avoid blocking the request.
        console.warn(`⚠️  Redis unavailable — processing payment inline: ${checkoutId}`);
        logAudit('callback_inline_processing', { checkoutId, reason: 'Redis unavailable' });
        processPaymentJob({ checkoutId, callbackData, callbackSecurity: req.callbackSecurity })
          .catch((err) => {
            console.error(`❌ Inline payment processing failed for ${checkoutId}:`, err.message);
            logAudit('callback_inline_processing_failed', { checkoutId, error: err.message });
          });
      }
    } catch (error) {
      console.error('❌ Callback handler error:', error);
      logAudit('callback_handler_error', {
        error: error.message,
        ip: req.callbackSecurity?.clientIP
      });
    }
  }
);

/**
 * Helper: update a payment's status AND write a PaymentStatusUpdate audit row
 * in the same atomic operation.
 *
 * Issue 3 Fix: every status transition must produce an immutable audit record.
 *
 * @param {Object} client - prisma or tx (transaction client)
 * @param {number} paymentId
 * @param {PaymentStatus} oldStatus
 * @param {PaymentStatus} newStatus
 * @param {string} reason - human-readable reason e.g. 'callback_received'
 * @param {Object} [extraData] - additional fields to set on the Payment
 */
async function updatePaymentStatusWithAudit(client, paymentId, oldStatus, newStatus, reason, extraData = {}) {
  return client.$transaction([
    client.payment.update({
      where: { id: paymentId },
      data: { status: newStatus, ...extraData },
    }),
    client.paymentStatusUpdate.create({
      data: {
        paymentId,
        oldStatus,
        newStatus,
        reason,
      },
    }),
  ]);
}


/**
 * Core payment processing logic — shared by both the BullMQ worker and the
 * synchronous inline fallback (used when Redis is unavailable, CRIT-2 fix).
 *
 * @param {{ checkoutId: string, callbackData: object, callbackSecurity: object }} data
 * @returns {Promise<object>} Processing result
 */
async function processPaymentJob({ checkoutId, callbackData, callbackSecurity }) {
  const { getSessionExpiryQueue } = require('../workers/timeoutWorkers');
  console.log(`\n🔄 Processing payment: ${checkoutId}`);

  // ✅ STEP 1: Find payment record
  const payment = await prisma.payment.findUnique({
    where: { mpesa_reference: checkoutId }
  });

  if (!payment) {
    console.error(`❌ Payment not found: ${checkoutId}`);
    logAudit('payment_not_found', { checkoutId });
    throw new Error(`Payment record not found for checkout ${checkoutId}`);
  }

  // ✅ STEP 2: Idempotency - check if already processed
  if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.FAILED) {
    console.log(`ℹ️ Payment already processed: ${payment.status}`);
    return { status: 'already_processed', paymentStatus: payment.status };
  }

  // ✅ STEP 3: Verify callback result code
  // MED-1 FIX: Safaricom may send ResultCode as a string; coerce to Number.
  const resultCode = Number(callbackData?.ResultCode ?? -1);

  if (resultCode !== 0) {
    console.log(`❌ Payment declined/cancelled: ResultCode=${resultCode}`);

    // Issue 3 Fix: write PaymentStatusUpdate alongside the status change
    await updatePaymentStatusWithAudit(
      prisma, payment.id,
      payment.status, PaymentStatus.FAILED,
      'callback_received_non_zero_result'
    );

    sendPaymentStatus(payment.transactionId, {
      transactionId: payment.transactionId,
      checkoutId,
      status: 'failed',
      resultCode,
      message: 'Payment declined or cancelled'
    });

    logAudit('payment_failed', { checkoutId, resultCode });
    return { status: 'failed', resultCode };
  }

  // ✅ STEP 4: Extract and verify amount
  const callbackAmount = Number(
    callbackData?.CallbackMetadata?.Item?.find(
      (item) => item?.Name === 'Amount'
    )?.Value
  );

  if (!callbackAmount || callbackAmount !== payment.amount) {
    console.error(
      `🔴 FRAUD: Amount mismatch. Payment=${payment.amount}, Callback=${callbackAmount}`
    );

    // Issue 3 Fix: write PaymentStatusUpdate alongside the status change
    await updatePaymentStatusWithAudit(
      prisma, payment.id,
      payment.status, PaymentStatus.FRAUD_DETECTED,
      'fraud_detected_amount_mismatch'
    );

    sendPaymentStatus(payment.transactionId, {
      transactionId: payment.transactionId,
      checkoutId,
      status: 'failed',
      error: 'Fraud detected: amount mismatch'
    });

    logAudit('fraud_detected_amount_mismatch', {
      checkoutId,
      expectedAmount: payment.amount,
      callbackAmount,
      phone: payment.phone
    });

    // Alert admin
    console.error('🚨 SECURITY ALERT: Potential fraud attempt');

    return { status: 'fraud_detected' };
  }

  // ✅ STEP 5: Verify with M-Pesa API
  console.log(`🔍 Verifying payment with M-Pesa API...`);

  const apiVerification = await verifyPaymentWithMpesa(checkoutId);

  // HIGH-3 FIX: On API verification failure, throw immediately WITHOUT marking the
  // payment as VERIFICATION_FAILED. BullMQ will retry the job up to 3 times (with
  // exponential backoff) giving the Safaricom query API time to catch up.
  // Only after all retries are exhausted does the worker's 'failed' event handler
  // mark the payment as VERIFICATION_FAILED and log a critical audit alert for
  // manual review. This prevents falsely flagging the customer when the API lags.
  if (!apiVerification.verified) {
    console.error(`❌ M-Pesa API verification failed (will retry): ${apiVerification.error || apiVerification.message}`);
    logAudit('payment_verification_transient_failure', {
      checkoutId,
      error: apiVerification.error,
      resultCode: apiVerification.resultCode
    });
    throw new Error(`M-Pesa API verification failed: ${apiVerification.error || apiVerification.message}`);
  }

  // HIGH-4 FIX: Prefer the planKey stored at payment initiation over amount-based
  // lookup. Using getPackageByAmount() breaks if prices ever change — a KES 10 payment
  // made yesterday would be looked up against the new price table today.
  // Fall back to amount-based lookup only for rows created before the planKey migration.
  const { getPackageByAmount, getPackageByPlanKey } = require('../lib/packages');
  const pkg = payment.planKey
    ? (getPackageByPlanKey(payment.planKey) || getPackageByAmount(payment.amount))
    : getPackageByAmount(payment.amount);

  if (!pkg) {
    console.error(`❌ Invalid package amount: ${payment.amount}`);
    throw new Error(`Unknown package amount: ${payment.amount}`);
  }
  const { duration: expiryDuration, timeLabel } = pkg;

  const { registerOrExtendMACSession } = require('../services/MACAddressService');
  const mpesaReceipt = callbackData?.CallbackMetadata?.Item?.find(
    (item) => item?.Name === 'MpesaReceiptNumber'
  )?.Value;

  let sessionResult;
  try {
    console.log('Beginning database transaction...');
    sessionResult = await prisma.$transaction(async (tx) => {
      const sessionDetails = await registerOrExtendMACSession(
        {
          mac: payment.macAddress,
          phone: payment.phone,
          ip: payment.ipAddress,
          expiryDuration,
          paymentId: payment.id,
        },
        tx // Pass the transaction client to the service
      );

      if (!sessionDetails.success) {
        // This will cause the transaction to roll back
        throw new Error(`Failed to register/extend session: ${sessionDetails.error}`);
      }

      // CRIT-5 FIX: Use a conditional updateMany (WHERE status = PENDING) instead of
      // a plain update. With concurrency: 5, two workers can both read status=PENDING
      // and both pass the early-exit check at Step 2. The conditional update is an
      // atomic MySQL test-and-set: only the FIRST worker gets count=1; the second
      // gets count=0 and we throw a sentinel error to abort the transaction cleanly.
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.COMPLETED,
          mpesa_receipt_number: mpesaReceipt || null,
          completedAt: new Date(),
          expiresAt: sessionDetails.expiresAt,
        },
      });

      if (claimed.count === 0) {
        // Another concurrent worker already completed this payment.
        // Use a sentinel so the outer catch can return gracefully without a BullMQ retry.
        const sentinel = new Error('PAYMENT_ALREADY_COMPLETED');
        sentinel.alreadyCompleted = true;
        throw sentinel;
      }

      // Issue 3 Fix: write PaymentStatusUpdate INSIDE the same transaction
      // so status change + audit row are always atomically consistent.
      await tx.paymentStatusUpdate.create({
        data: {
          paymentId: payment.id,
          oldStatus: payment.status,
          newStatus: PaymentStatus.COMPLETED,
          reason: 'callback_received_successful',
        },
      });

      console.log('✅ DB Transaction: Payment marked as completed and session created/extended.');
      return sessionDetails;
    });

    // Issue 2 Fix: enqueue BullMQ session expiry job AFTER the transaction commits.
    // Enqueueing inside the $transaction is a bug — if TX rolls back, the job fires
    // for a session row that was never actually committed.
    const sessionExpiryQueue = getSessionExpiryQueue();
    if (sessionExpiryQueue && sessionResult.queueJob) {
      const { action, jobId, sessionId, macAddress, delay } = sessionResult.queueJob;
      if (action === 'reschedule') {
        // Remove stale job first, then re-add
        await sessionExpiryQueue.remove(jobId).catch(() => {});
      }
      await sessionExpiryQueue.add(
        'expire-session',
        { sessionId, macAddress },
        {
          delay,
          jobId,
          removeOnComplete: true,
        }
      );
      console.log(`[Expiry Job] ${action === 'reschedule' ? 'Rescheduled' : 'Scheduled'} for session ${sessionId}`);
    }

    logAudit('payment_db_transaction_success', {
      checkoutId,
      phone: payment.phone,
      amount: payment.amount,
      mpesaReceipt,
      sessionAction: sessionResult.action,
    });

  } catch (transactionError) {
    // CRIT-5 FIX: If another concurrent worker already completed this payment, the
    // sentinel error signals a clean idempotent exit — not a real failure.
    if (transactionError.alreadyCompleted) {
      console.log(`ℹ️ Payment ${checkoutId} already completed by another worker. Skipping.`);
      logAudit('payment_already_completed_concurrent', { checkoutId });
      return { status: 'already_processed' };
    }
    console.error(`❌ Database transaction failed: ${transactionError.message}`);
    logAudit('payment_db_transaction_failed', { checkoutId, error: transactionError.message });
    // Re-throw to let caller handle the retry
    throw transactionError;
  }

  // ✅ STEP 7: Whitelist MAC address (External service call, outside of DB transaction)
  console.log(`🔓 Whitelisting MAC on router: ${payment.macAddress}`);
  const { whitelistMAC } = require('../config/mikrotik');
  const mikrotikResult = await whitelistMAC(payment.macAddress, timeLabel, pkg);

  if (!mikrotikResult.success) {
    // The core payment is already committed. We just flag that this part failed.
    console.error(`⚠️ MAC whitelist failed after successful payment: ${mikrotikResult.message}`);

    // Issue 3 Fix: wrap in transaction so audit row is written atomically
    await updatePaymentStatusWithAudit(
      prisma, payment.id,
      PaymentStatus.COMPLETED, PaymentStatus.COMPLETED_BUT_MAC_FAILED,
      'mac_whitelist_failed_post_payment'
    );

    logAudit('payment_mac_whitelist_failed', {
      checkoutId,
      mac: payment.macAddress,
      error: mikrotikResult.message
    });

    // Enqueue a job to retry the whitelisting
    const { getMacWhitelistRetryQueue } = require('../workers/timeoutWorkers');
    const retryQueue = getMacWhitelistRetryQueue();
    if (retryQueue) {
      await retryQueue.add('retry-mac-whitelist', {
        paymentId: payment.id,
        timeLabel: timeLabel
      }, {
        attempts: 5, // Retry up to 5 times
        backoff: {
          type: 'exponential',
          delay: 60000 // Start with a 1-minute delay
        },
        removeOnComplete: true,
        jobId: `mac-retry-${payment.id}`
      });
      console.log(`🔁 Enqueued MAC whitelist retry job for payment ${payment.id}`);
    }

    // Alert admin - manual intervention needed if retries fail
    console.error('🚨 ALERT: MAC whitelisting failed. Automatic retry scheduled.');

    return {
      status: 'completed_but_mac_failed',
      message: mikrotikResult.message
    };
  }

  console.log(`✅ MAC whitelisted successfully`);
  logAudit('payment_mac_whitelist_success', { checkoutId, mac: payment.macAddress });

  sendPaymentStatus(payment.transactionId, {
    transactionId: payment.transactionId,
    checkoutId,
    status: 'completed',
    phone: payment.phone,
    amount: payment.amount,
    expiresAt: sessionResult.expiresAt,
    macAddress: payment.macAddress
  });

  return {
    status: 'success',
    checkoutId,
    phone: payment.phone,
    expiresAt: sessionResult.expiresAt
  };
}

/**
 * Background job processor for secure payment processing
 * Uses BullMQ worker pattern
 */
async function setupPaymentWorker() {
  const { Worker } = require('bullmq');
  const { getSessionExpiryQueue } = require('../workers/timeoutWorkers');
  // WORKER-FIX: BullMQ Workers must receive a connection with
  // maxRetriesPerRequest: null (blocking XREAD requirement). Using the standard
  // producer client (maxRetriesPerRequest: 3) causes BullMQ to throw:
  //   "BullMQ: Your redis options maxRetriesPerRequest must be null"
  // which previously triggered unhandledRejection → gracefulShutdown → forced exit.
  const connection = getWorkerRedisClient();
  if (!connection) {
    console.warn('[mpesaCallback] Redis not available — payment worker not started');
    return null;
  }

  const paymentWorker = new Worker(
    'mpesa-payments',
    // CRIT-2 FIX: Delegate to the shared processPaymentJob() function.
    // This ensures the BullMQ worker and the inline Redis-unavailable fallback
    // execute identical logic — no duplication, no divergence risk.
    async (job) => {
      const { checkoutId } = job.data;
      try {
        return await processPaymentJob(job.data);
      } catch (error) {
        console.error(`❌ Payment processing error: ${error.message}`);
        logAudit('payment_processing_error', { checkoutId, error: error.message });
        // Re-throw to trigger BullMQ retry
        throw error;
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 payments concurrently
      limiter: {
        max: 10,
        duration: 1000 // 10 jobs per second max
      }
    }
  );

  // Handle worker events
  paymentWorker.on('completed', (job) => {
    console.log(`✅ Job completed: ${job.data.checkoutId}`);
  });

  // HIGH-3 FIX: On permanent failure (all BullMQ retries exhausted), if the payment
  // is still PENDING/VERIFICATION_FAILED, mark it as VERIFICATION_FAILED and emit a
  // critical audit alert for manual review. This defers the status write until we know
  // all retries have genuinely failed rather than eagerly marking on the first attempt.
  paymentWorker.on('failed', async (job, error) => {
    const { checkoutId } = job.data;
    console.error(`❌ Job permanently failed: ${checkoutId} - ${error.message}`);
    // Only act on verification failures — other errors (DB, network) are already logged
    if (error.message.startsWith('M-Pesa API verification failed')) {
      try {
        const payment = await prisma.payment.findUnique({ where: { mpesa_reference: checkoutId } });
        if (payment && payment.status === PaymentStatus.PENDING) {
          await updatePaymentStatusWithAudit(
            prisma, payment.id,
            payment.status, PaymentStatus.VERIFICATION_FAILED,
            'mpesa_api_verification_failed_permanent'
          );
        }
        logAudit('payment_verification_failed_permanent', {
          checkoutId,
          error: error.message,
          action: 'MANUAL_REVIEW_REQUIRED'
        });
        console.error(`🚨 CRITICAL: Payment ${checkoutId} verification failed after all retries. MANUAL REVIEW REQUIRED.`);
      } catch (auditErr) {
        console.error(`❌ Failed to write verification_failed audit for ${checkoutId}:`, auditErr.message);
      }
    }
  });

  console.log('🚀 Payment worker started');
}

// MED-5 FIX: Do NOT call getPaymentQueue() synchronously at module-load time.
// At require() time, Redis may not yet be connected (index.js calls getRedisClient()
// inside app.listen's callback, which fires after all routes are registered).
// Deferring to setImmediate ensures this runs after the current tick — i.e. after
// index.js has finished registering routes and started the server, by which point
// the Redis singleton is initialised and getPaymentQueue() returns a real Queue.
setImmediate(() => {
  if (getPaymentQueue()) {
    setupPaymentWorker().catch(error => {
      console.warn('⚠️ Failed to initialize payment worker:', error.message);
    });
  }
});

module.exports = router;
