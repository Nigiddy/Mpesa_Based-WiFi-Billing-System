const express = require("express");
const { paymentLimiter } = require("../middleware/rateLimit");
const router = express.Router();
const prisma = require("../config/prismaClient");
const { initiateSTKPush, processMpesaCallback } = require("../controllers/mpesaController");
const { logAudit } = require("../utils/auditLogger");

// ✅ Handle MPesa STK Push Request with rate limiting
router.post("/stkpush", paymentLimiter, async (req, res) => {
    const { phone, amount } = req.body;

    // Input validation: phone must be valid, amount must be number
    if (
        !phone ||
        typeof phone !== "string" ||
        !/^\d{10,13}$/.test(phone) ||
        typeof amount !== "number" ||
        amount < 10 || amount > 10000
    ) {
        return res.status(400).json({ success: false, message: "Invalid phone or amount" });
    }

    try {
        const transactionId = await initiateSTKPush(phone, amount);
        // Audit log: payment initiation
        logAudit("payment_initiated", { phone, amount, transactionId });
        res.json({ success: true, message: "STK Push sent", transactionId });
    } catch (error) {
        console.error("STK Push Error:", error);
        res.status(500).json({ success: false, message: "Failed to send STK Push" });
    }
});

// ✅ Handle MPesa Callback (Payment Confirmation)
router.post("/mpesa/callback", async (req, res) => {
    try {
        await processMpesaCallback(req.body);
        res.status(200).json({ success: true, message: "Callback processed" });
    } catch (error) {
        console.error("MPesa Callback Error:", error);
        res.status(500).json({ success: false, message: "Callback processing failed" });
    }
});

// ✅ Check Payment Status (for Real-Time Updates)
router.get("/status/:transactionId", async (req, res) => {
    const { transactionId } = req.params;
    try {
        const payment = await prisma.payment.findUnique({
            where: { transactionId },
            select: { status: true }
        });
        if (!payment) {
            return res.json({ status: "Pending" });
        }
        res.json({ status: payment.status });
    } catch (err) {
        console.error("Error fetching payment status:", err);
        res.json({ status: "Pending" });
    }
});

module.exports = router;
