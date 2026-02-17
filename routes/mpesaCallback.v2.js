/**
 * Improved M-Pesa Callback Handler
 * Includes:
 * - Security validation
 * - IP whitelist verification
 * - Signature validation (when available)
 * - Idempotent processing
 * - Amount verification
 * - Server-side M-Pesa API verification
 * - Audit logging
 */

const express = require("express");
const prisma = require("../config/prismaClient");
const { getPaymentQueue } = require("../config/paymentQueue");
const {
  validateCallbackSecurityMiddleware,
  verifyPaymentWithMpesa
} = require("../middleware/mpesaCallbackSecurityMiddleware");
const { validateCallbackStructure } = require("../validators/paymentValidator");
const { paymentLimiter } = require("../middleware/rateLimit");
const { logAudit } = require("../utils/auditLogger");

const router = express.Router();

/**
 * POST /mpesa/callback
 * M-Pesa STK Push callback endpoint
 * 
 * Security layers:
 * 1. Rate limiting per IP
 * 2. Source IP validation (Safaricom only)
 * 3. Callback structure validation
 * 4. Idempotency check
 * 5. Amount verification
 * 6. M-Pesa API verification
 */
router.post(
  "/mpesa/callback",
  paymentLimiter,
  validateCallbackSecurityMiddleware,
  async (req, res) => {
    // Immediate acknowledgment to prevent M-Pesa retries
    // We'll process asynchronously in background
    res.status(200).json({ success: true });

    try {
      // Extract callback data
      const callbackData = req.body?.Body?.stkCallback;

      // Validate structure
      const structureValidation = validateCallbackStructure(req.body);
      if (!structureValidation.valid) {
        console.error("❌ Invalid callback structure:", structureValidation.errors);
        logAudit('callback_invalid_structure', {
          errors: structureValidation.errors,
          ip: req.callbackSecurity.clientIP
        });
        return;
      }

      const checkoutId = callbackData.CheckoutRequestID;
      console.log(`📥 Callback received: ${checkoutId}`);

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
        console.log(`⚠️  Redis unavailable - payment will be processed without queue: ${checkoutId}`);
        logAudit('callback_queued_skipped', { checkoutId, reason: 'Redis unavailable' });
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
 * Background job processor for secure payment processing
 * Uses BullMQ worker pattern
 */
async function setupPaymentWorker() {
  const { Worker } = require('bullmq');
  const Redis = require('ioredis');

  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  const paymentWorker = new Worker(
    'mpesa-payments',
    async (job) => {
      const { checkoutId, callbackData, callbackSecurity } = job.data;

      console.log(`\n🔄 Processing payment: ${checkoutId}`);

      try {
        // ✅ STEP 1: Find payment record
        const payment = await prisma.payment.findUnique({
          where: { mpesaRef: checkoutId }
        });

        if (!payment) {
          console.error(`❌ Payment not found: ${checkoutId}`);
          logAudit('payment_not_found', { checkoutId });
          throw new Error(`Payment record not found for checkout ${checkoutId}`);
        }

        // ✅ STEP 2: Idempotency - check if already processed
        if (payment.status === 'completed' || payment.status === 'failed') {
          console.log(`ℹ️ Payment already processed: ${payment.status}`);
          return { status: 'already_processed', paymentStatus: payment.status };
        }

        // ✅ STEP 3: Verify callback result code
        const resultCode = callbackData?.ResultCode;

        if (resultCode !== 0) {
          console.log(`❌ Payment declined/cancelled: ResultCode=${resultCode}`);

          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'failed' }
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

          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'fraud_detected' }
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

        if (!apiVerification.verified) {
          console.error(`❌ M-Pesa API verification failed:`, apiVerification.error);

          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'verification_failed' }
          });

          logAudit('payment_verification_failed', {
            checkoutId,
            error: apiVerification.error
          });

          // This is critical - payment may have failed at M-Pesa
          throw new Error(`M-Pesa API verification failed: ${apiVerification.error}`);
        }

        // ✅ STEP 6: Extract M-Pesa receipt number
        const mpesaReceipt = callbackData?.CallbackMetadata?.Item?.find(
          (item) => item?.Name === 'MpesaReceiptNumber'
        )?.Value;

        // ✅ STEP 7: Get package details for expiry calculation
        const PACKAGES = {
          '10': 1 * 60 * 60 * 1000,      // 1 hour
          '15': 4 * 60 * 60 * 1000,      // 4 hours
          '20': 12 * 60 * 60 * 1000,     // 12 hours
          '30': 24 * 60 * 60 * 1000      // 24 hours
        };

        const expiryDuration = PACKAGES[String(payment.amount)];

        if (!expiryDuration) {
          console.error(`❌ Invalid package amount: ${payment.amount}`);
          throw new Error(`Unknown package amount: ${payment.amount}`);
        }

        // ✅ STEP 8: Mark as completed in atomic transaction
        const result = await prisma.$transaction(async (tx) => {
          // Double-check status hasn't changed (race condition prevention)
          const current = await tx.payment.findUnique({
            where: { id: payment.id }
          });

          if (current.status !== 'pending') {
            console.log(`ℹ️ Payment status changed during processing: ${current.status}`);
            return { status: 'already_processed' };
          }

          // Mark as completed
          const updated = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'completed',
              mpesaRef: mpesaReceipt || checkoutId,
              expiresAt: new Date(Date.now() + expiryDuration)
            }
          });

          return { status: 'updated', payment: updated };
        });

        if (result.status === 'already_processed') {
          return result;
        }

        console.log(`✅ Payment marked as completed: ${checkoutId}`);

        logAudit('payment_completed', {
          checkoutId,
          phone: payment.phone,
          amount: payment.amount,
          mpesaReceipt
        });

        // ✅ STEP 9: Whitelist MAC address
        console.log(`🔓 Whitelisting MAC: ${payment.macAddress}`);

        const { whitelistMAC } = require('../config/mikrotik');

        const timeLabel = {
          '10': '1Hr',
          '15': '4Hrs',
          '20': '12Hrs',
          '30': '24Hrs'
        }[String(payment.amount)];

        const mikrotikResult = await whitelistMAC(payment.macAddress, timeLabel);

        if (!mikrotikResult.success) {
          // Payment completed but MAC not whitelisted - partial failure
          console.error(`⚠️ MAC whitelist failed: ${mikrotikResult.message}`);

          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'completed_but_mac_failed' }
          });

          logAudit('payment_mac_whitelist_failed', {
            checkoutId,
            mac: payment.macAddress,
            error: mikrotikResult.message
          });

          // Alert admin - manual intervention needed
          console.error('🚨 ALERT: Payment completed but MAC whitelisting failed. Manual intervention required.');

          return {
            status: 'completed_but_mac_failed',
            message: mikrotikResult.message
          };
        }

        console.log(`✅ MAC whitelisted successfully`);

        return {
          status: 'success',
          checkoutId,
          phone: payment.phone,
          expiresAt: result.payment.expiresAt
        };
      } catch (error) {
        console.error(`❌ Payment processing error: ${error.message}`);

        logAudit('payment_processing_error', {
          checkoutId: job.data.checkoutId,
          error: error.message
        });

        // Re-throw to trigger retry
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

  paymentWorker.on('failed', (job, error) => {
    console.error(`❌ Job failed: ${job.data.checkoutId} - ${error.message}`);
  });

  console.log('🚀 Payment worker started');
}

// Initialize worker on module load (only if Redis is available)
if (getPaymentQueue()) {
  setupPaymentWorker().catch(error => {
    console.warn('⚠️ Failed to initialize payment worker:', error.message);
  });
}

module.exports = router;
