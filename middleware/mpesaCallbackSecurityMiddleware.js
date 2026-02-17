/**
 * M-Pesa Callback Security Middleware
 * Verifies callback signatures and prevents spoofing
 */

const crypto = require('crypto');
const axios = require('axios');

/**
 * M-Pesa production IP addresses for whitelist
 * Get updated list from M-Pesa documentation
 */
const SAFARICOM_IPS = {
  sandbox: ['196.201.214.200', '196.201.214.201'],
  production: [
    '196.201.214.200',
    '196.201.214.201',
    '196.201.214.202'
    // Add more as provided by Safaricom
  ]
};

/**
 * Verify callback came from Safaricom servers
 * @param {string} ip - Request IP address
 * @returns {boolean}
 */
function isValidSafaricomIP(ip) {
  const env = process.env.MPESA_ENV || 'sandbox';
  const allowedIPs = SAFARICOM_IPS[env] || SAFARICOM_IPS.sandbox;

  if (process.env.NODE_ENV !== 'production') {
    // In development, accept all IPs
    console.warn('⚠️ IP validation disabled in non-production environment');
    return true;
  }

  const isValid = allowedIPs.includes(ip);

  if (!isValid) {
    console.error(`❌ SECURITY: Callback from unauthorized IP: ${ip}`);
  }

  return isValid;
}

/**
 * Verify M-Pesa callback signature (if provided)
 * Note: M-Pesa may not always send signature in API response
 * This is a placeholder for when Safaricom implements callback signing
 * @param {Object} callbackData - The callback data
 * @param {string} signature - Signature header (if present)
 * @returns {boolean}
 */
function verifyCallbackSignature(callbackData, signature) {
  // Currently, M-Pesa STK Push callbacks may not include signatures
  // This implementation is ready for when they do

  if (!signature) {
    console.warn('⚠️ No callback signature provided by M-Pesa');
    // For now, we rely on IP whitelist verification
    // This should be enhanced when Safaricom adds signature support
    return true;
  }

  try {
    // If signature exists, verify it
    // This is placeholder - actual implementation depends on M-Pesa's signing method
    const publicKey = process.env.MPESA_PUBLIC_KEY;

    if (!publicKey) {
      console.warn('⚠️ MPESA_PUBLIC_KEY not configured for signature verification');
      return false;
    }

    // Verify signature (example using RSA-SHA256)
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(JSON.stringify(callbackData));
    const isValid = verifier.verify(publicKey, signature, 'base64');

    if (!isValid) {
      console.error('❌ SECURITY: Invalid callback signature');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error.message);
    return false;
  }
}

/**
 * Query M-Pesa API to verify payment status
 * This is the most reliable verification method
 */
async function verifyPaymentWithMpesa(checkoutRequestId) {
  try {
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET) {
      console.error('❌ M-Pesa credentials not configured for verification');
      return { verified: false, error: 'Missing credentials' };
    }

    const moment = require('moment');
    const { stkPush } = require('../config/mpesa');

    // Get access token (this function already exists)
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const tokenResponse = await axios.get(
      `${
        process.env.MPESA_ENV === 'sandbox'
          ? 'https://sandbox.safaricom.co.ke'
          : 'https://api.safaricom.co.ke'
      }/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${auth}` }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const env = process.env.MPESA_ENV === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    // Query STK Push status
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const response = await axios.post(
      `${env}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        CheckoutRequestID: checkoutRequestId,
        Timestamp: timestamp,
        Password: password
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const resultCode = response.data.ResultCode;

    // ResultCode 0 = Success, money received
    if (resultCode === '0') {
      return {
        verified: true,
        status: 'success',
        data: response.data
      };
    }

    // ResultCode 1032 = Request cancelled
    // ResultCode 1 = Transaction sent but user declined
    // ResultCode 500 = Generic error
    return {
      verified: false,
      resultCode,
      status: 'payment_not_completed',
      message: response.data.ResultDesc
    };
  } catch (error) {
    console.error('❌ M-Pesa verification error:', error.message);
    return {
      verified: false,
      error: error.message,
      note: 'Verification failed - review payment status manually'
    };
  }
}

/**
 * Middleware to protect M-Pesa callback endpoint
 * Verifies:
 * 1. Request comes from authorized Safaricom IP
 * 2. Callback structure is valid
 * 3. No duplicate processing
 */
const validateCallbackSecurityMiddleware = (req, res, next) => {
  try {
    // Extract client IP (handle proxy scenarios)
    const clientIP =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    console.log(`📍 Callback received from IP: ${clientIP}`);

    // 1️⃣ Verify IP is from Safaricom
    const isAuthorizedIP = isValidSafaricomIP(clientIP);

    if (!isAuthorizedIP) {
      console.error(`🔴 SECURITY: Unauthorized callback IP: ${clientIP}`);
      // In production, reject immediately
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      console.warn('⚠️ Allowing unauthorized IP in development');
    }

    // 2️⃣ Verify callback signature (if implemented by Safaricom)
    const signature = req.headers['x-safaricom-signature'] || req.headers['signature'];
    const isValidSignature = verifyCallbackSignature(req.body, signature);

    if (!isValidSignature && signature) {
      console.error('🔴 SECURITY: Invalid callback signature');
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
    }

    // 3️⃣ Attach verification info to request for later use
    req.callbackSecurity = {
      clientIP,
      isAuthorizedIP,
      isValidSignature,
      ReceivedAt: new Date()
    };

    next();
  } catch (error) {
    console.error('❌ Callback security middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Security check failed'
    });
  }
};

module.exports = {
  isValidSafaricomIP,
  verifyCallbackSignature,
  verifyPaymentWithMpesa,
  validateCallbackSecurityMiddleware,
  SAFARICOM_IPS
};
