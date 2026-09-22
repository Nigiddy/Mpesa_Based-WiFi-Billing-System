const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
// RATE-LIMIT FIX: Use the dedicated rate-limit client (enableOfflineQueue: true)
// instead of the main producer client (enableOfflineQueue: false).
//
// RedisStore.init() issues a SCRIPT LOAD command synchronously during module
// evaluation, before the ioredis TCP handshake completes. The main producer
// client's enableOfflineQueue: false causes that command to throw
// "Stream isn't writeable". The rate-limit client buffers it and replays it
// once connected — eliminating the startup warning and ensuring the Redis-backed
// store is always used when Redis is available.
const { getRateLimitRedisClient } = require('../config/redis');

/**
 * AUTH-R2 FIX: Build a Redis-backed store for express-rate-limit.
 *
 * Why Redis? The default in-memory store resets on every process restart and
 * does NOT share state across multiple app instances (blue/green, scale-out).
 * An attacker can bypass the limit with a simple process restart or by hitting
 * different instances.
 *
 * Graceful fallback: if Redis is unavailable at call time, `createStore` returns
 * `undefined` which makes express-rate-limit fall back to its in-memory store
 * automatically. This prevents a Redis outage from completely breaking rate
 * limiting — it degrades to per-instance counting rather than failing open.
 *
 * @param {string} prefix - Redis key prefix to namespace this limiter's counters.
 */
function createStore(prefix) {
  const redis = getRateLimitRedisClient();
  if (!redis) {
    console.warn(`[RateLimit] Redis unavailable — ${prefix} limiter using in-memory store (not cluster-safe)`);
    return undefined;
  }
  return new RedisStore({
    // ioredis API: pass arbitrary commands as (command, ...args)
    sendCommand: (...args) => redis.call(...args),
    prefix: `rl:${prefix}:`,
  });
}

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
  store: createStore('auth'),
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
  store: createStore('payment'),
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
  store: createStore('api'),
});

module.exports = {
  authLimiter,
  paymentLimiter,
  apiLimiter
};


