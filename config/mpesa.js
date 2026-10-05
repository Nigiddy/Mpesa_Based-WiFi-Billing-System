require("dotenv").config();
const axios = require("axios");
const moment = require("moment");
// HIGH-2 FIX: Import the shared Redis client for cross-process token caching.
// Token is stored in Redis so all PM2 cluster workers share the same cached
// value instead of each making independent OAuth requests on expiry.
const { getRedisClient } = require("./redis");

// Note: Environment variable validation is now handled by config/secrets.js on startup
const MPESA_ENV = process.env.MPESA_ENV || "sandbox"; // "sandbox" or "production"
const MPESA_BASE_URL =
    MPESA_ENV === "sandbox"
        ? "https://sandbox.safaricom.co.ke"
        : "https://api.safaricom.co.ke";

// ─── Token Cache ──────────────────────────────────────────────────────────────
// Daraja access tokens are valid for ~3600 seconds (1 hour).
// We cache and reuse the token, refreshing it 5 minutes before expiry.
//
// HIGH-2 FIX: Tokens are stored in Redis (key: mpesa:access_token, TTL: 55 min)
// so all PM2 cluster processes share the same cached token. Falls back to the
// in-memory singleton when Redis is unavailable.
//
// MED-3 FIX: _tokenFetchPromise is a mutex that ensures concurrent calls when
// the token is expired all await the SAME fetch instead of each firing an
// independent OAuth request to Safaricom (which could hit rate limits).
const REDIS_TOKEN_KEY = 'mpesa:access_token';
const TOKEN_TTL_SECONDS = 55 * 60; // 55 minutes
const TOKEN_TTL_MS = TOKEN_TTL_SECONDS * 1000;

// In-memory fallback (used when Redis is unavailable)
let _cachedToken = null;
let _tokenExpiresAt = 0;

// Mutex: if a fetch is in progress, any concurrent callers await this promise
let _tokenFetchPromise = null;

/**
 * Returns a valid Daraja API access token, using the cached value when possible.
 * Redis is checked first (shared across cluster); falls back to in-memory cache.
 * Only one concurrent OAuth request is made at a time (mutex via _tokenFetchPromise).
 * @returns {Promise<string|null>}
 */
const getAccessToken = async () => {
    // ── 1. Redis cache lookup ───────────────────────────────────────────────
    const redis = getRedisClient();
    if (redis) {
        try {
            const cached = await redis.get(REDIS_TOKEN_KEY);
            if (cached) {
                console.log("🔑 Using Redis-cached MPesa access token");
                return cached;
            }
        } catch (redisErr) {
            // Redis read failure is non-fatal; fall through to mutex / in-memory
            console.warn('⚠️ Redis token cache read failed, falling back:', redisErr.message);
        }
    }

    // ── 2. Mutex check BEFORE in-memory lookup ──────────────────────────────
    // MED-3 FIX: Check the mutex here — before the in-memory cache — so that
    // concurrent callers that all miss Redis all join the SAME in-flight request
    // rather than each independently observing a null in-memory token and
    // starting their own fetch. Previously the mutex was checked after the
    // memory check, leaving a window where the promise was null even though a
    // fetch was in progress (cleared by `finally` before cache writes settled).
    if (_tokenFetchPromise) {
        console.log("⏳ Awaiting in-flight MPesa token fetch...");
        return _tokenFetchPromise;
    }

    // ── 3. In-memory fallback cache ─────────────────────────────────────────
    if (_cachedToken && Date.now() < _tokenExpiresAt) {
        console.log("🔑 Using in-memory cached MPesa access token");
        return _cachedToken;
    }

    // ── 4. Fetch a fresh token ──────────────────────────────────────────────
    console.log("🔄 Fetching fresh MPesa access token from Safaricom...");
    const auth = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    _tokenFetchPromise = (async () => {
        try {
            const response = await axios.get(
                `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
                { headers: { Authorization: `Basic ${auth}` } }
            );

            const token = response.data.access_token;
            const expiresAt = Date.now() + TOKEN_TTL_MS;

            // Write to Redis (best-effort; don't fail the whole flow if Redis is down)
            if (redis) {
                try {
                    await redis.set(REDIS_TOKEN_KEY, token, 'EX', TOKEN_TTL_SECONDS);
                } catch (writeErr) {
                    console.warn('⚠️ Redis token cache write failed (using in-memory only):', writeErr.message);
                }
            }

            // Always update in-memory fallback
            _cachedToken = token;
            _tokenExpiresAt = expiresAt;

            console.log(
                `✅ MPesa Access Token obtained. Cached until ${new Date(expiresAt).toISOString()}`
            );
            return token;
        } catch (error) {
            console.error(
                "❌ MPesa Auth Error:",
                error.response ? error.response.data : error.message
            );
            // Invalidate both caches on error so the next call retries
            _cachedToken = null;
            _tokenExpiresAt = 0;
            if (redis) {
                await redis.del(REDIS_TOKEN_KEY).catch(() => {});
            }
            return null;
        } finally {
            // MED-3 FIX: Release the mutex AFTER cache writes are done (above).
            // The in-memory and Redis writes happen before this line, so any
            // caller that arrives now will hit the cache first and skip the mutex.
            _tokenFetchPromise = null;
        }
    })();

    return _tokenFetchPromise;
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
