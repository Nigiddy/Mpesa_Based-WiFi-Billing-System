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
const { paymentLimiter } = require("../middleware/rateLimit");

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
    try {
      const { phone, mac, amount, package: pkg } = req.validatedPayment;

      // 🔒 CRITICAL: Check for duplicate/double-click submissions
      // Prevent multiple STK Push requests for same phone within 60 seconds
      const recentPending = await prisma.payment.findFirst({
        where: {
          phone,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.COMPLETED] },
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000) // Last 60 seconds
          }
        }
      });

      if (recentPending) {
        return res.status(409).json({
          success: false,
          error: 'Payment already in progress',
          message: 'A payment is already being processed for this number. Please wait for confirmation.'
        });
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
          mpesaRef: mpesaResponse.CheckoutRequestID // Save the reference immediately
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
 */
router.get("/payments/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Simple validation
    if (!transactionId || typeof transactionId !== 'string' || transactionId.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: {
        id: true,
        status: true,
        mpesaRef: true,
        expiresAt: true,
        amount: true,
        createdAt: true
      }
    });

    if (!payment) {
      return res.json({
        success: true,
        data: {
          status: 'not_found',
          message: 'Transaction not found'
        }
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
 * Get full payment details (for receipts)
 */
router.get("/payments/:transactionId/details", async (req, res) => {
  try {
    const { transactionId } = req.params;

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

    if (!payment) {
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
    console.error("❌ /v1/payments/details error:", error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details'
    });
  }
});

module.exports = router;
