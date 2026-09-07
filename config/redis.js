/**
 * Shared Redis client singleton.
 *
 * BOOT-5 FIX: Centralises all Redis connections so every part of the
 * application (BullMQ queues/workers, auth denylist, health checks) shares
 * one physical connection rather than each creating their own.
 *
 * Usage:
 *   const { getRedisClient } = require('../config/redis');
 *   const redis = getRedisClient(); // may return null if Redis is unavailable
 */

require('dotenv').config();
const Redis = require('ioredis');

let _client = null;

/**
 * Returns the shared ioredis client, creating it lazily on first call.
 * Returns null if Redis is unavailable; callers must handle null gracefully.
 * @returns {import('ioredis').Redis | null}
 */
function getRedisClient() {
  if (_client) return _client;

  try {
    _client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // Required for BullMQ workers
      enableOfflineQueue: false,  // BOOT-6 FIX: fail fast instead of buffering commands offline
      lazyConnect: false,         // Connect eagerly so startup errors surface early
    });

    _client.on('error', (err) => {
      // Log but don't crash — callers degrade gracefully when Redis is unavailable
      console.error('[Redis] Connection error:', err.message);
    });

    _client.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    _client.on('reconnecting', () => {
      console.warn('[Redis] Reconnecting...');
    });

    return _client;
  } catch (err) {
    console.error('[Redis] Failed to create connection:', err.message);
    _client = null;
    return null;
  }
}

/**
 * Gracefully closes the shared Redis connection.
 * Must be called during graceful shutdown AFTER BullMQ workers are closed.
 */
async function closeRedisClient() {
  if (_client) {
    try {
      await _client.quit();
      _client = null;
      console.log('[Redis] Connection closed gracefully');
    } catch (err) {
      console.error('[Redis] Error during close:', err.message);
      try { _client?.disconnect(); } catch (_) {}
      _client = null;
    }
  }
}

module.exports = { getRedisClient, closeRedisClient };
