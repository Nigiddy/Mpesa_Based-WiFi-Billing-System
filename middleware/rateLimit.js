const rateLimit = require('express-rate-limit');

// Rate limiting for authentication endpoints
// AUTH-10 FIX: Removed skipSuccessfulRequests: true — it allowed credential-stuffing
// attacks to succeed as long as most attempts used wrong passwords. An auth endpoint
// should count ALL attempts, not just failures.
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1 * 60 * 1000, // 15 min (prod) / 1 min (dev)
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // skipSuccessfulRequests intentionally omitted — defaults to false
});

// Rate limiting for payment initiation endpoints
// NOTE: This limiter is NOT applied to /mpesa/callback (see AUTH-11 fix in mpesaCallback.js)
const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  message: {
    error: 'Too many payment requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Rate limiting for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  paymentLimiter,
  apiLimiter
};

