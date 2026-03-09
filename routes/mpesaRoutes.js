const express = require("express");
const { stkPush } = require("../config/mpesa");
const prisma = require("../config/prismaClient");
const { isValidPackage } = require("../lib/packages");
const { getPaymentTimeoutQueue } = require("../workers/timeoutWorkers");

const router = express.Router();

// Initiate payment - aligns with Frontend apiClient.initiatePayment
router.post("/payments/initiate", async (req, res) => {
  try {
    const { phone, amount, macAddress, package: pkg, speed } = req.body || {};

    if (!phone || !amount || !macAddress) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    if (!isValidPackage(amount)) {
      return res.status(400).json({ success: false, error: "Invalid package selected." });
    }

    // Accept +2547XXXXXXXX or 2547XXXXXXXX
    const normalizedPhone = phone.startsWith("+") ? phone.slice(1) : phone;
    if (!/^2547\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, error: "Invalid phone number. Use 2547XXXXXXXX format." });
    }

    const transactionId = `TXN_${Date.now()}`;

    await prisma.payment.create({
      data: {
        phone: normalizedPhone,
        amount: Number(amount),
        transactionId,
        macAddress,
        status: "pending"
      }
    });

    const mpesaResponse = await stkPush(normalizedPhone, amount, transactionId);

    if (!mpesaResponse) {
      return res.status(500).json({ success: false, error: "STK Push failed. No response from MPesa API." });
    }

    // Persist CheckoutRequestID for callback correlation and schedule timeout job
    try {
      const checkoutId = mpesaResponse.CheckoutRequestID || null;
      if (checkoutId) {
        await prisma.payment.update({
          where: { transactionId },
          data: { mpesaRef: checkoutId }
        });
      }

      // Schedule a job to check for timeout if callback isn't received
      const paymentTimeoutQueue = getPaymentTimeoutQueue();
      if (paymentTimeoutQueue) {
        await paymentTimeoutQueue.add(
          'check-payment-timeout',
          { transactionId },
          {
            delay: 95000, // 95 seconds, M-Pesa timeout is ~90s
            removeOnComplete: true,
            jobId: `timeout-${transactionId}` // Deduplication
          }
        );
        console.log(`[Timeout Job] Scheduled for ${transactionId} in 95s`);
      }
    } catch (e) {
      console.error("Failed to persist mpesa_ref or schedule timeout job:", e);
    }

    return res.json({
      success: true,
      data: {
        transactionId,
        mpesaRef: mpesaResponse.CheckoutRequestID || mpesaResponse.MerchantRequestID || null,
        status: "pending",
        expiresAt: null,
      },
      message: "STK Push sent!",
    });
  } catch (error) {
    console.error("/payments/initiate error:", error);
    return res.status(500).json({ success: false, error: "Failed to initiate payment" });
  }
});

// Check payment status - aligns with Frontend apiClient.checkPaymentStatus
router.get("/payments/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: { status: true, mpesaRef: true, expiresAt: true }
    });
    if (!payment) {
      return res.json({ success: true, data: { status: "pending", mpesaRef: null, expiresAt: null } });
    }
    return res.json({ success: true, data: {
      status: payment.status || "pending",
      mpesaRef: payment.mpesaRef,
      expiresAt: payment.expiresAt
    }});
  } catch (error) {
    console.error("/payments/status error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch payment status" });
  }
});

module.exports = router;
