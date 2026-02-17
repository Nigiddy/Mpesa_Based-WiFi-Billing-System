const express = require("express");
const { paymentLimiter } = require("../middleware/rateLimit");
const prisma = require("../config/prismaClient");
const { getPaymentQueue } = require("../config/paymentQueue");
const { whitelistMAC } = require("../config/mikrotik");

const router = express.Router();

// Add rate limiting to callback endpoint
router.post("/mpesa/callback", paymentLimiter, async (req, res) => {
  // Immediate acknowledgment for webhook reliability
  res.status(200).json({ success: true });

  // Enqueue payment job for async processing
  try {
    const callbackData = req.body?.Body?.stkCallback;
    const checkoutId = callbackData?.CheckoutRequestID;
    if (!callbackData || !checkoutId) {
      console.error("❌ Invalid callback payload");
      return;
    }
    const queue = getPaymentQueue();
    if (queue) {
      await queue.add('process-payment', {
        checkoutId,
        callbackData
      }, {
        jobId: checkoutId // idempotency: only one job per checkoutId
      });
      console.log(`📥 Payment job enqueued for checkoutId: ${checkoutId}`);
    } else {
      console.log(`⚠️  Redis unavailable - callback processed without queue for checkoutId: ${checkoutId}`);
    }
  } catch (err) {
    console.error('❌ Failed to enqueue payment job:', err);
  }
});

module.exports = router;
