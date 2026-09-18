/**
 * Improved M-Pesa payment routes with security and validation
 * Includes:
 * - Input validation
 * - Duplicate payment prevention
 * - Secure error handling
 */

const express = require("express");
const prisma = require("../config/prismaClient");
const { stkPush } = require("../config/mpesa");
const { validatePaymentInitiationMiddleware } = require("../middleware/validationMiddleware");
const { paymentLimiter, apiLimiter } = require("../middleware/rateLimit");
const { verifyMACvsARP } = require('../utils/arpLookup');
const { logAudit } = require('../utils/auditLogger');
const { getRedisClient } = require('../config/redis');

const { PaymentStatus } = require("@prisma/client");
const { getPaymentTimeoutQueue } = require("../workers/timeoutWorkers");

const router = express.Router();

/**
 * POST /api/v1/payments/initiate
 * Initiates M-Pesa STK Push for WiFi package payment
 * 
 * Request body:
 * {
 *   phone: string (254712345678 or 07123456678)
 *   amount: number (10, 15, 20, or 30)
 *   package: string ("1Hr", "4Hrs", "12Hrs", "24Hrs")
 *   macAddress: string (AA:BB:CC:DD:EE:FF)
 * }
 */
router.post(
  "/payments/initiate",
  paymentLimiter,
  validatePaymentInitiationMiddleware,
  async (req, res) => {
    const { phone, mac, amount, package: pkg } = req.validatedPayment;

    // 🔒 CRITICAL FIX (Issue 1): The previous findFirst → check → create pattern
    // is a TOCTOU race condition. Two concurrent requests for the same phone both
    // pass the findFirst check before either creates a payment row.
    //
    // Fix: Acquire a Redis distributed lock (SET NX PX) keyed on the phone number
    // for the duration of the entire initiation flow (STK Push + DB insert).
    // The lock TTL is 70 s — longer than the STK Push timeout so it always clears.
    // If Redis is unavailable we fall back to a DB-level check (best-effort).
    const LOCK_TTL_MS = 70_000;
    const lockKey = `payment_lock:${phone}`;
    let lockAcquired = false;
    const redis = getRedisClient();

    try {
      if (redis) {
        // SET key value NX PX ttl — returns 'OK' if acquired, null if already held
        const result = await redis.set(lockKey, '1', 'NX', 'PX', LOCK_TTL_MS);
        if (result !== 'OK') {
          return res.status(409).json({
            success: false,
            error: 'Payment already in progress',
            message: 'A payment is already being processed for this number. Please wait for confirmation.'
          });
        }
        lockAcquired = true;
      } else {
        // Redis unavailable — fall back to DB check (not race-safe but better than nothing)
        console.warn('⚠️ Redis unavailable — using DB-level duplicate check (not race-safe)');
        const recentPending = await prisma.payment.findFirst({
          where: {
            phone,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.COMPLETED] },
            createdAt: { gte: new Date(Date.now() - 60 * 1000) }
          }
        });
        if (recentPending) {
          return res.status(409).json({
            success: false,
            error: 'Payment already in progress',
            message: 'A payment is already being processed for this number. Please wait for confirmation.'
          });
        }
      }

      try {
        // 🔍 ARP cross-check: verify submitted MAC matches router ARP entry for this IP.
        // Fails open (just logs) when ARP is unavailable (cloud/VPN deployments).
        const arpResult = await verifyMACvsARP(req.ip, mac);
        if (arpResult.reason === 'mismatch') {
          console.warn(
            `⚠️  MAC mismatch for ${req.ip}: submitted=${mac}, arp=${arpResult.arpMAC}`
          );
          logAudit('payment_mac_arp_mismatch', {
            ip: req.ip,
            submittedMAC: mac,
            arpMAC: arpResult.arpMAC,
          });
          // Block the payment — the client is presenting a MAC that doesn't match
          // what the router recorded for their IP address.
          return res.status(400).json({
            success: false,
            error: 'MAC address verification failed',
            message: 'The MAC address provided does not match your device. Please reconnect to the hotspot and try again.',
          });
        }

        if (arpResult.reason === 'arp_unavailable') {
          // Soft warning only — don't block; allow payment to continue.
          console.warn(`ℹ️  ARP unavailable for ${req.ip} — MAC unverified (non-blocking)`);
        }

        // Generate unique transaction ID with randomness
        const crypto = require('crypto');
        const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Step 1: Call M-Pesa STK Push API FIRST
        console.log(`Initiating STK Push for ${phone} with amount ${amount}`);
        const mpesaResponse = await stkPush(phone, amount, transactionId);

        if (!mpesaResponse || !mpesaResponse.CheckoutRequestID) {
          console.error(`❌ STK Push failed for transaction attempt ${transactionId}. M-Pesa API returned no CheckoutRequestID.`);
          // Do not create a payment record if the API call itself fails.
          return res.status(500).json({
            success: false,
            error: 'Failed to initiate payment',
            message: process.env.NODE_ENV === 'production'
              ? 'Could not connect to payment service. Please try again.'
              : 'M-Pesa API returned no CheckoutRequestID'
          });
        }
        
        console.log(`✅ STK Push sent: ${transactionId} → ${mpesaResponse.CheckoutRequestID}`);

        // Step 2: Create the payment record in one atomic operation
        const payment = await prisma.payment.create({
          data: {
            phone,
            amount,
            transactionId,
            macAddress: mac,
            status: PaymentStatus.PENDING,
            ipAddress: req.ip,
            mpesaRef: mpesaResponse.CheckoutRequestID, // Save the reference immediately
            // L-7: Store the selected plan key so the callback never needs to
            // re-derive the package from the amount (breaks if prices change).
            planKey: pkg,
          }
        });
        console.log(`📝 Payment record created: ${transactionId}`);

        // Step 3: Schedule a job to time out the payment if no callback is received
        const paymentTimeoutQueue = getPaymentTimeoutQueue();
        if (paymentTimeoutQueue) {
          await paymentTimeoutQueue.add(
            'check-timeout',
            { transactionId: payment.transactionId },
            {
              delay: 100000, // 100 seconds
              removeOnComplete: true,
              jobId: `timeout-${payment.transactionId}` // Deduplication
            }
          );
          console.log(`⏳ Timeout job scheduled for ${payment.transactionId}`);
        }

        return res.json({
          success: true,
          data: {
            transactionId,
            mpesaRef: mpesaResponse.CheckoutRequestID,
            status: 'pending', // Keep lowercase for frontend compatibility
            expiresAt: null,
            message: 'Enter PIN on your phone to complete payment'
          }
        });
      } finally {
        // 🔓 Always release the lock — whether success, error, or early return.
        // If DB create succeeded, the lock held just long enough to prevent a duplicate;
        // the mpesaRef uniqueness constraint is the permanent guard going forward.
        if (lockAcquired && redis) {
          await redis.del(lockKey).catch((err) =>
            console.error('⚠️ Failed to release payment lock:', err.message)
          );
        }
      }
    } catch (error) {
      console.error("❌ /v1/payments/initiate error:", error);

      // Don't expose internal error details to client
      return res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
        transactionId: req.body.transactionId || 'unknown'
      });
    }
  }
);


/**
 * GET /api/v1/payments/status/:transactionId
 * Check payment status
 * Used for frontend polling (should migrate to WebSocket)
 *
 * SEC-FIX (AUTH-9): This endpoint was previously unauthenticated and returned
 * mpesaRef + amount to anyone who could enumerate a transactionId. The format
 * TXN_<epoch>_<4-byte-hex> is guessable by time-range scanning.
 *
 * Fix: Require the caller to supply the phone number used during payment
 * initiation. If the phone is missing or does not match the record we return
 * 404 (not 403) so the response does not confirm whether the transactionId
 * exists at all. The phone is never included in the response payload.
 */
router.get("/payments/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { phone } = req.query;

    // SEC-FIX: Validate transactionId format
    if (!transactionId || typeof transactionId !== 'string' || transactionId.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
    }

    // SEC-FIX: Require phone to prove ownership of this transaction
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required to check payment status'
      });
    }

    // Normalise phone: accept 07..., +2547..., 2547...
    const normalisedPhone = phone.trim().replace(/^\+/, '').replace(/^0/, '254');

    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: {
        id: true,
        phone: true,     // fetched for ownership check only — not returned in response
        status: true,
        mpesaRef: true,
        expiresAt: true,
        amount: true,
        createdAt: true
      }
    });

    // SEC-FIX: Return 404 for BOTH "not found" and "phone mismatch" cases so
    // the response does not confirm whether a given transactionId exists.
    if (!payment || payment.phone !== normalisedPhone) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check if payment has timed out (pending for more than 5 minutes)
    const ageMs = Date.now() - payment.createdAt.getTime();
    const timeoutMs = 5 * 60 * 1000;

    if (payment.status === PaymentStatus.PENDING && ageMs > timeoutMs) {
      return res.json({
        success: true,
        data: {
          status: 'timeout',
          message: 'Payment confirmation timeout. Check your M-Pesa app.'
        }
      });
    }

    return res.json({
      success: true,
      data: {
        status: payment.status.toLowerCase(), // Send lowercase to frontend
        mpesaRef: payment.mpesaRef,
        expiresAt: payment.expiresAt
        // phone is intentionally omitted from the response
      }
    });
  } catch (error) {
    console.error("❌ /v1/payments/status error:", error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment status'
    });
  }
});

/**
 * GET /api/v1/payments/:transactionId/details
 * Get payment details — used by the captive portal to show a payment confirmation.
 *
 * AUTH-9 FIX: This endpoint returns PII (phone number). To prevent enumeration,
 * the caller must supply their phone number as a query parameter.
 * If the phone does not match the payment record, we return 404 (not 403) to
 * avoid confirming whether the transaction ID exists at all.
 *
 * Security: rate-limited + phone-match requirement.
 */
router.get("/payments/:transactionId/details", apiLimiter, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { phone } = req.query;

    // AUTH-9 FIX: Require phone number to access payment details
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required to retrieve payment details'
      });
    }

    // Normalise phone: accept 07..., +2547..., 2547...
    const normalised = phone.trim().replace(/^\+/, '').replace(/^0/, '254');

    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: {
        id: true,
        transactionId: true,
        phone: true,
        amount: true,
        status: true,
        mpesaRef: true,
        expiresAt: true,
        createdAt: true
      }
    });

    // AUTH-9 FIX: Return 404 for both "not found" and "phone mismatch"
    // so the response does not confirm whether a given transaction ID exists.
    if (!payment || payment.phone !== normalised) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    return res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error("\u274c /v1/payments/details error:", error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details'
    });
  }
});

module.exports = router;
