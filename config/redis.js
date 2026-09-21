/**
 * Shared Redis client singletons.
 *
 * BOOT-5 FIX: Centralises all Redis connections so every part of the
 * application (BullMQ queues/workers, auth denylist, health checks) uses
 * a managed connection rather than creating ad-hoc instances.
 *
 * A-4 FIX: Two separate ioredis connections are maintained:
 *
 *   getRedisClient()       — Standard connection for Queue producers, health
 *                            checks, and any non-blocking Redis commands.
 *                            maxRetriesPerRequest: 3 (fail-fast on errors).
 *
 *   getWorkerRedisClient() — Blocking connection exclusively for BullMQ
 *                            Worker instances. BullMQ Workers use XREAD in
 *                            blocking mode; sharing a single connection with
 *                            Queue producers causes producers to stall while
 *                            the worker blocks. maxRetriesPerRequest: null
 *                            is required by BullMQ for this connection.
 *
 * Usage:
 *   const { getRedisClient }       = require('../config/redis'); // Queue / general
 *   const { getWorkerRedisClient } = require('../config/redis'); // Worker only
 */

require('dotenv').config();
const Redis = require('ioredis');

// ── Queue / producer connection ───────────────────────────────────────────────
let _client = null;

/**
 * Returns the standard (non-blocking) ioredis client for Queue producers,
 * health checks, and general Redis commands.
 * Returns null if Redis is unavailable; callers must handle null gracefully.
 * @returns {import('ioredis').Redis | null}
 */
function getRedisClient() {
  if (_client) return _client;

  try {
    _client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,   // Fail-fast for Queue producers / HTTP handlers
      enableOfflineQueue: false, // BOOT-6 FIX: fail fast instead of buffering commands offline
      lazyConnect: false,        // Connect eagerly so startup errors surface early
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
 * Gracefully closes the standard Redis connection.
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

// ── Worker / blocking connection ─────────────────────────────────────────────
let _workerClient = null;

/**
 * Returns the blocking ioredis client for exclusive use by BullMQ Worker
 * instances. BullMQ Workers issue XREAD with a blocking timeout; using this
 * connection for Queue producers would stall all enqueue operations.
 *
 * maxRetriesPerRequest: null is required by BullMQ — it tells ioredis not to
 * limit retries on commands, which is necessary for the long-poll XREAD calls.
 *
 * Returns null if Redis is unavailable.
 * @returns {import('ioredis').Redis | null}
 */
function getWorkerRedisClient() {
  if (_workerClient) return _workerClient;

  try {
    _workerClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // Required for BullMQ Workers (blocking XREAD)
      enableOfflineQueue: false,
      lazyConnect: false,
    });

    _workerClient.on('error', (err) => {
      console.error('[Redis:worker] Connection error:', err.message);
    });

    _workerClient.on('connect', () => {
      console.log('[Redis:worker] Connected successfully');
    });

    _workerClient.on('reconnecting', () => {
      console.warn('[Redis:worker] Reconnecting...');
    });

    return _workerClient;
  } catch (err) {
    console.error('[Redis:worker] Failed to create connection:', err.message);
    _workerClient = null;
    return null;
  }
}

/**
 * Gracefully closes the worker Redis connection.
 * Must be called after all BullMQ workers are closed but before process exit.
 */
async function closeWorkerRedisClient() {
  if (_workerClient) {
    try {
      await _workerClient.quit();
      _workerClient = null;
      console.log('[Redis:worker] Connection closed gracefully');
    } catch (err) {
      console.error('[Redis:worker] Error during close:', err.message);
      try { _workerClient?.disconnect(); } catch (_) {}
      _workerClient = null;
    }
  }
}

module.exports = {
  getRedisClient,
  closeRedisClient,
  getWorkerRedisClient,
  closeWorkerRedisClient,
};
