const express = require("express");
const db = require("../config/db");
const { whitelistMAC } = require("../config/mikrotik");

const router = express.Router();

router.post("/mpesa/callback", (req, res) => {
  console.log("📲 M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));

  const callbackData = req.body?.Body?.stkCallback;
  const checkoutId = callbackData?.CheckoutRequestID;
  const resultCode = callbackData?.ResultCode;

  if (!callbackData || !checkoutId) {
    return res.status(400).json({ success: false, error: "Invalid callback payload" });
  }

  if (resultCode !== 0) {
    // Mark failed
    db.query("UPDATE payments SET status = 'failed' WHERE transaction_id = ?", [checkoutId]);
    return res.json({ success: false, message: "Payment failed or canceled" });
  }

  const amount = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === "Amount")?.Value;
  const mpesaRef = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === "MpesaReceiptNumber")?.Value;

  // Fetch MAC address and update payment
  db.query("SELECT mac_address FROM payments WHERE mpesa_ref = ?", [checkoutId], async (err, results) => {
    if (err || results.length === 0) {
      console.error("❌ Database Error:", err);
      return res.status(500).json({ success: false, error: "Transaction not found" });
    }

    const mac = results[0].mac_address;
    let time = "1Hr";
    if (Number(amount) === 30) time = "24Hrs";
    else if (Number(amount) === 20) time = "12Hrs";
    else if (Number(amount) === 15) time = "4Hrs";

    console.log(`✅ Whitelisting MAC ${mac} for ${time}...`);

    const mikrotikResponse = await whitelistMAC(mac, time);

    if (mikrotikResponse.success) {
      db.query(
        "UPDATE payments SET status = 'completed', mpesa_ref = ?, expires_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE mpesa_ref = ?",
        [mpesaRef || checkoutId || null, checkoutId]
      );
      return res.json({ success: true, message: mikrotikResponse.message });
    } else {
      console.error("❌ MikroTik Error:", mikrotikResponse.message);
      return res.status(500).json({ success: false, error: "MikroTik whitelist failed" });
    }
  });
});

module.exports = router;
