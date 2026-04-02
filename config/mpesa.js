require("dotenv").config();
const axios = require("axios");
const moment = require("moment");

// Note: Environment variable validation is now handled by config/secrets.js on startup
const MPESA_ENV = process.env.MPESA_ENV || "sandbox"; // "sandbox" or "production"
const MPESA_BASE_URL =
    MPESA_ENV === "sandbox"
        ? "https://sandbox.safaricom.co.ke"
        : "https://api.safaricom.co.ke";

// ─── Token Cache ──────────────────────────────────────────────────────────────
// Daraja access tokens are valid for ~3600 seconds (1 hour).
// We cache and reuse the token, refreshing it 55 minutes after the last fetch
// to avoid hitting the OAuth endpoint on every STK Push or query call.
let _cachedToken = null;
let _tokenExpiresAt = 0; // Unix ms timestamp after which the token must be refreshed

const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes in milliseconds

/**
 * Returns a valid Daraja API access token, using the cached value when possible.
 * Fetches a new token from Safaricom only when the cache is empty or expired.
 * @returns {Promise<string|null>}
 */
const getAccessToken = async () => {
    // Return cached token if it is still valid
    if (_cachedToken && Date.now() < _tokenExpiresAt) {
        console.log("🔑 Using cached MPesa access token");
        return _cachedToken;
    }

    console.log("🔄 Fetching fresh MPesa access token from Safaricom...");
    const auth = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    try {
        const response = await axios.get(
            `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
            { headers: { Authorization: `Basic ${auth}` } }
        );

        _cachedToken = response.data.access_token;
        _tokenExpiresAt = Date.now() + TOKEN_TTL_MS;

        console.log(
            `✅ MPesa Access Token obtained. Cached until ${new Date(_tokenExpiresAt).toISOString()}`
        );
        return _cachedToken;
    } catch (error) {
        console.error(
            "❌ MPesa Auth Error:",
            error.response ? error.response.data : error.message
        );
        // Invalidate cache on error so the next call retries
        _cachedToken = null;
        _tokenExpiresAt = 0;
        return null;
    }
};

// ─── STK Push ─────────────────────────────────────────────────────────────────

/**
 * Initiates an M-Pesa STK Push prompt on the customer's phone.
 * @param {string} phone       - Customer phone in 2547XXXXXXXX format
 * @param {number} amount      - Amount in KES
 * @param {string} transactionId - Internal transaction reference
 * @returns {Promise<object|null>} Daraja API response, or null on failure
 */
const stkPush = async (phone, amount, transactionId) => {
    console.log(
        `📩 STK Push Request: Phone: ${phone}, Amount: ${amount}, TransactionID: ${transactionId}`
    );

    const accessToken = await getAccessToken();
    if (!accessToken) {
        console.error("❌ Failed to get MPesa access token. STK Push aborted.");
        return null;
    }

    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
        `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const payload = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "WiFi Payment",
        TransactionDesc: `WiFi Payment - ${transactionId}`
    };

    try {
        console.log("📤 Sending STK Push...");
        const response = await axios.post(
            `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
            payload,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (response.data.ResponseCode === "0") {
            console.log("✅ STK Push Successful:", response.data);
            return response.data;
        } else {
            console.error("❌ STK Push Failed:", response.data);
            return null;
        }
    } catch (error) {
        console.error(
            "❌ MPesa STK Push Error:",
            error.response ? error.response.data : error.message
        );
        return null;
    }
};

module.exports = { stkPush, getAccessToken };
