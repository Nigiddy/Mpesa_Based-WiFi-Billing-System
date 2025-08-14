const express = require("express");
const db = require("../config/db");
const { whitelistMAC } = require("../config/mikrotik");

const router = express.Router();

router.post("/mpesa/callback", async (req, res) => {
  console.log("📲 M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));

  const callbackData = req.body?.Body?.stkCallback;
  const checkoutId = callbackData?.CheckoutRequestID;
  const resultCode = callbackData?.ResultCode;

  if (!callbackData || !checkoutId) {
    return res.status(400).json({ success: false, error: "Invalid callback payload" });
  }

  if (resultCode !== 0) {
    // Mark failed using parameterized query
    try {
      await db.promise().query(
        "UPDATE payments SET status = 'failed' WHERE mpesa_ref = ?", 
        [checkoutId]
      );
      return res.json({ success: false, message: "Payment failed or canceled" });
    } catch (error) {
      console.error("❌ Failed to update payment status:", error);
      return res.status(500).json({ success: false, error: "Failed to update payment status" });
    }
  }

  const amount = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === "Amount")?.Value;
  const mpesaRef = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === "MpesaReceiptNumber")?.Value;

  try {
    // Fetch MAC address using parameterized query
    const [results] = await db.promise().query(
      "SELECT mac_address FROM payments WHERE mpesa_ref = ?", 
      [checkoutId]
    );
    
    if (!results || results.length === 0) {
      console.error("❌ Transaction not found for checkout ID:", checkoutId);
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
      // Update payment status using parameterized query
      await db.promise().query(
        "UPDATE payments SET status = 'completed', mpesa_ref = ?, expires_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE mpesa_ref = ?",
        [mpesaRef || checkoutId || null, checkoutId]
      );
      return res.json({ success: true, message: mikrotikResponse.message });
    } else {
      console.error("❌ MikroTik Error:", mikrotikResponse.message);
      return res.status(500).json({ success: false, error: "MikroTik whitelist failed" });
    }
  } catch (error) {
    console.error("❌ Database Error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
