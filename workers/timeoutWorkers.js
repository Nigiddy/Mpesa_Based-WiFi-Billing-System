const { Worker, Queue } = require('bullmq');
const prisma = require('../config/prismaClient');
const { PaymentStatus } = require('@prisma/client');
const { disconnectByMac, whitelistMAC, getActiveSessions, closeMikrotikConnection } = require('../config/mikrotik');
const { logAudit } = require('../utils/auditLogger');
// A-4 FIX: Two separate ioredis connections — one for Queue producers (non-blocking),
// one for Worker consumers (blocking, maxRetriesPerRequest: null).
// Sharing a single connection between producers and Workers caused producers to
// stall while Workers blocked on XREAD.
const { getRedisClient, getWorkerRedisClient, closeWorkerRedisClient } = require('../config/redis');

// ─── Queue factories ──────────────────────────────────────────────────────────
// Each queue is created lazily the first time it is requested. Returns null
// if Redis is not available, and callers skip the queue operation.

let _paymentTimeoutQueue = null;
let _sessionExpiryQueue = null;
let _macWhitelistRetryQueue = null;
let _sessionSyncQueue = null;

function createQueue(name) {
  // A-4 FIX (BUG CORRECTION): was `getRedisConnection()` which is undefined —
  // no such function exists. The correct function for Queue producers is
  // `getRedisClient()` (maxRetriesPerRequest: 3, non-blocking).
  // Workers still use getWorkerRedisClient() (maxRetriesPerRequest: null).
  const conn = getRedisClient();
  if (!conn) {
    console.warn(`[Workers] Redis unavailable — queue '${name}' not created. Jobs will be skipped.`);
    return null;
  }
  try {
    return new Queue(name, { connection: conn });
  } catch (err) {
    console.error(`[Workers] Failed to create queue '${name}':`, err.message);
    return null;
  }
}

// --- Payment Timeout Worker ---
const paymentTimeoutQueue = (() => { try { _paymentTimeoutQueue = createQueue('payment-timeout'); return _paymentTimeoutQueue; } catch { return null; } })();


const paymentTimeoutWorker = paymentTimeoutQueue ? new Worker('payment-timeout', async (job) => {
  const { transactionId } = job.data;
  console.log(`⏱️ [Payment Timeout Worker] Checking transaction ${transactionId}`);
  try {
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
    });

    // If payment is still pending, mark it as expired.
    if (payment && payment.status === PaymentStatus.PENDING) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.EXPIRED, failedAt: new Date() },
      });
      console.log(`  ✅ Transaction ${transactionId} marked as EXPIRED.`);
      logAudit('PAYMENT_TIMEOUT_AUTO', { transactionId });
    }
  } catch (error) {
    console.error(`❌ [Payment Timeout Worker] Error processing job for ${transactionId}:`, error);
    logAudit('PAYMENT_TIMEOUT_WORKER_ERROR', { transactionId, error: error.message });
    throw error; // Re-throw to allow for retries
  }
// A-4: Worker uses blocking connection (maxRetriesPerRequest: null)
}, { connection: getWorkerRedisClient() }) : null;

paymentTimeoutWorker && paymentTimeoutWorker.on('failed', (job, error) => {
  console.error(`🚨 [Payment Timeout Worker] Job ${job.id} for transaction ${job.data.transactionId} failed permanently.`, error);
  logAudit('PAYMENT_TIMEOUT_WORKER_FAILURE', {
    jobId: job.id,
    transactionId: job.data.transactionId,
    error: error.message,
  });
});


// --- Session Expiry Worker ---
const sessionExpiryQueue = (() => { try { _sessionExpiryQueue = createQueue('session-expiry'); return _sessionExpiryQueue; } catch { return null; } })();

const sessionExpiryWorker = sessionExpiryQueue ? new Worker('session-expiry', async (job) => {
  const { sessionId, macAddress } = job.data;
  console.log(`⏱️ [Session Expiry Worker] Expiring session ${sessionId} for MAC ${macAddress}`);
  try {
    // Disconnect from MikroTik
    const resp = await disconnectByMac(macAddress);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        disconnectedAt: new Date(),
        reason: resp.success ? 'EXPIRED' : 'EXPIRED_DISCONNECT_FAILED',
      },
    });

    logAudit('SESSION_EXPIRED_AUTO_DISCONNECT', { sessionId, macAddress, disconnectSuccess: resp.success });

  } catch (error) {
    console.error(`❌ [Session Expiry Worker] Error processing job for session ${sessionId}:`, error);
    logAudit('SESSION_EXPIRY_WORKER_ERROR', { sessionId, macAddress, error: error.message });
    throw error;
  }
// A-4: Worker uses blocking connection
}, { connection: getWorkerRedisClient() }) : null;

sessionExpiryWorker && sessionExpiryWorker.on('failed', (job, error) => {
  console.error(`🚨 [Session Expiry Worker] Job ${job.id} for MAC ${job.data.macAddress} failed permanently.`, error);
  logAudit('SESSION_EXPIRY_WORKER_FAILURE', {
    jobId: job.id,
    sessionId: job.data.sessionId,
    macAddress: job.data.macAddress,
    error: error.message,
  });
});


// --- MAC Whitelist Retry Worker ---
const macWhitelistRetryQueue = (() => { try { _macWhitelistRetryQueue = createQueue('mac-whitelist-retry'); return _macWhitelistRetryQueue; } catch { return null; } })();

const macWhitelistRetryWorker = macWhitelistRetryQueue ? new Worker('mac-whitelist-retry', async (job) => {
  const { paymentId, timeLabel } = job.data;
  console.log(`🔁 [MAC Retry Worker] Retrying whitelist for payment ${paymentId}`);
  try {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found for MAC whitelist retry.`);
    }

    // Only retry if it's in the specific 'failed' state
    if (payment.status !== PaymentStatus.COMPLETED_BUT_MAC_FAILED) {
      console.log(`  ✅ MAC for payment ${paymentId} already whitelisted or in different state (${payment.status}). Skipping retry.`);
      return;
    }

    const { getPackageByAmount } = require('../lib/packages');
    const pkg = getPackageByAmount(payment.amount);
    const mikrotikResult = await whitelistMAC(payment.macAddress, timeLabel, pkg);

    if (mikrotikResult.success) {
      // Success! Update status back to COMPLETED
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.COMPLETED },
      });
      console.log(`  ✅ MAC ${payment.macAddress} successfully whitelisted on retry.`);
      logAudit('MAC_WHITELIST_RETRY_SUCCESS', { paymentId, macAddress: payment.macAddress });
    } else {
      // Still failing, throw error to trigger BullMQ backoff retry
      throw new Error(`MikroTik still failing: ${mikrotikResult.message}`);
    }
  } catch (error) {
    console.error(`❌ [MAC Retry Worker] Error for payment ${paymentId}:`, error);
    logAudit('MAC_WHITELIST_RETRY_ERROR', { paymentId, error: error.message });
    throw error;
  }
// A-4: Worker uses blocking connection
}, { connection: getWorkerRedisClient() }) : null;

macWhitelistRetryWorker && macWhitelistRetryWorker.on('failed', (job, error) => {
  console.error(`🚨 [MAC Retry Worker] Job ${job.id} for payment ${job.data.paymentId} failed permanently.`, error);
  logAudit('MAC_WHITELIST_RETRY_FAILURE', {
    jobId: job.id,
    paymentId: job.data.paymentId,
    error: error.message,
  });
});


// --- Exported getters (lazy queue creation on first call) ---
function getPaymentTimeoutQueue() {
  if (!_paymentTimeoutQueue) _paymentTimeoutQueue = createQueue('payment-timeout');
  return _paymentTimeoutQueue;
}

function getSessionExpiryQueue() {
  if (!_sessionExpiryQueue) _sessionExpiryQueue = createQueue('session-expiry');
  return _sessionExpiryQueue;
}

function getMacWhitelistRetryQueue() {
  if (!_macWhitelistRetryQueue) _macWhitelistRetryQueue = createQueue('mac-whitelist-retry');
  return _macWhitelistRetryQueue;
}

// --- Session Sync Worker (Inactivity / Data Cap) ---
//
// Runs every 2 minutes. Compares DB active sessions against MikroTik's
// live hotspot active list. Any session whose MAC is no longer active on
// the router (kicked by idle-timeout or data cap) is marked disconnected.
// Also enforces application-level data caps for extra safety.
//
const sessionSyncQueue = (() => { try { _sessionSyncQueue = createQueue('session-sync'); return _sessionSyncQueue; } catch { return null; } })();

// Schedule one repeatable sync job if not already scheduled
(async () => {
  if (!sessionSyncQueue) {
    console.warn('[Session Sync] Redis unavailable — session sync disabled.');
    return;
  }
  try {
    const existing = await sessionSyncQueue.getRepeatableJobs();
    const alreadyScheduled = existing.some((j) => j.name === 'sync-sessions');
    if (!alreadyScheduled) {
      await sessionSyncQueue.add(
        'sync-sessions',
        {},
        {
          repeat: { every: 2 * 60 * 1000 }, // every 2 minutes
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      console.log('[Session Sync] Repeatable job scheduled (every 2 min)');
    }
  } catch (err) {
    console.warn('[Session Sync] Could not schedule repeatable job:', err.message);
  }
})();

const sessionSyncWorker = sessionSyncQueue ? new Worker(
  'session-sync',
  async () => {
    console.log('[Session Sync] Running reconciliation...');

    // 1. Fetch all DB sessions that are still considered active
    const activeSessions = await prisma.session.findMany({
      where: {
        disconnectedAt: null,
        expiryTime: { gt: new Date() },
      },
      select: { id: true, macAddress: true },
    });

    if (activeSessions.length === 0) return;

    // 2. Fetch active MACs and device stats in a single RouterOS round-trip (P-2)
    const { success, macs: activeMACsOnRouter, devices: activeDevices } = await getActiveSessions();

    // If MikroTik is unreachable, skip sync (don't wrongly close all sessions)
    if (!success) {
      console.warn('[Session Sync] MikroTik unreachable — skipping reconciliation this cycle.');
      return;
    }

    // 3. Find sessions whose MAC is no longer on the router
    let idleDisconnected = 0;
    for (const session of activeSessions) {
      const mac = session.macAddress.toUpperCase();
      if (!activeMACsOnRouter.has(mac)) {
        // MikroTik's idle-timeout fired: the *active session* was dropped but the
        // /ip/hotspot/user entry is still present, allowing free re-auth.
        // Remove the user entry explicitly so the device must pay again.
        disconnectByMac(mac).catch((e) =>
          console.error(`[Session Sync] disconnectByMac failed for ${mac}:`, e.message)
        );

        await prisma.session.update({
          where: { id: session.id },
          data: {
            disconnectedAt: new Date(),
            reason: 'idle_or_cap_mikrotik',
          },
        }).catch((e) =>
          console.error(`[Session Sync] Failed to update session ${session.id}:`, e.message)
        );
        logAudit('SESSION_IDLE_DISCONNECTED', { sessionId: session.id, macAddress: mac });
        idleDisconnected++;
      }
    }

    // 4. Application-level data cap check for extra safety
    //    (catches cases where MikroTik didn't enforce it)
    //    Re-uses the activeDevices already fetched above — no extra round-trip.
    if (activeDevices.length > 0) {
      // N+1 FIX: collect all MACs in a single pass, then fire ONE findMany instead
      // of one findFirst per device inside the loop.
      const deviceMacs = activeDevices
        .map((d) => (d.macAddress || '').toUpperCase())
        .filter(Boolean);

      const { getPackageByAmount } = require('../lib/packages');

      // Fetch the most-recent COMPLETED payment for every active MAC in one query.
      // We group in memory because Prisma/MySQL doesn't support DISTINCT ON.
      const rawPayments = await prisma.payment.findMany({
        where: { macAddress: { in: deviceMacs }, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { macAddress: true, amount: true },
      });

      // Keep only the latest payment per MAC (results are already ordered desc).
      const paymentByMac = new Map();
      for (const p of rawPayments) {
        if (!paymentByMac.has(p.macAddress)) {
          paymentByMac.set(p.macAddress, p);
        }
      }

      for (const device of activeDevices) {
        const mac = (device.macAddress || '').toUpperCase();
        const session = activeSessions.find((s) => s.macAddress.toUpperCase() === mac);
        if (!session) continue;

        const payment = paymentByMac.get(mac);
        if (!payment) continue;

        const pkg = getPackageByAmount(payment.amount);
        if (!pkg || !pkg.dataCapBytes || pkg.dataCapBytes === 0) continue;

        const totalBytes = (device.bytesIn || 0) + (device.bytesOut || 0);
        if (totalBytes >= pkg.dataCapBytes) {
          console.log(`[Data Cap] ${mac} exceeded cap (${totalBytes} >= ${pkg.dataCapBytes}). Disconnecting.`);
          await disconnectByMac(mac);
          await prisma.session.update({
            where: { id: session.id },
            data: { disconnectedAt: new Date(), reason: 'data_cap_exceeded' },
          }).catch(() => {});
          logAudit('SESSION_DATA_CAP_EXCEEDED', { sessionId: session.id, macAddress: mac, totalBytes, capBytes: pkg.dataCapBytes });
        }
      }
    }

    if (idleDisconnected > 0) {
      console.log(`[Session Sync] Marked ${idleDisconnected} session(s) as idle-disconnected.`);
    } else {
      console.log('[Session Sync] All active DB sessions confirmed on MikroTik.');
    }
  },
  // A-4: Worker uses blocking connection (maxRetriesPerRequest: null)
  { connection: getWorkerRedisClient() }
) : null;

sessionSyncWorker && sessionSyncWorker.on('failed', (job, err) => {
  console.error('[Session Sync] Job failed:', err.message);
  logAudit('SESSION_SYNC_WORKER_FAILURE', { error: err.message });
});

function getSessionSyncQueue() {
  if (!_sessionSyncQueue) _sessionSyncQueue = createQueue('session-sync');
  return _sessionSyncQueue;
}

// ─── Graceful shutdown helper ─────────────────────────────────────────────────
// BOOT-8 FIX: Export worker instances so index.js can call .close() on them
// during SIGTERM / SIGINT before disconnecting Redis and Prisma.

/**
 * Gracefully closes all BullMQ workers.
 * Call this in gracefulShutdown() before closing Redis.
 */
async function closeWorkers() {
  const workers = [
    paymentTimeoutWorker,
    sessionExpiryWorker,
    macWhitelistRetryWorker,
    sessionSyncWorker,
  ];
  await Promise.allSettled(
    workers
      .filter(Boolean)
      .map((w) => w.close().catch((e) => console.error('[Workers] Error closing worker:', e.message)))
  );
  console.log('[Workers] All BullMQ workers closed');

  // A-4: Close the worker Redis connection after all workers are drained.
  // The standard Queue connection is closed separately by closeRedisClient().
  await closeWorkerRedisClient();

  // Close the persistent MikroTik singleton connection (P-5)
  await closeMikrotikConnection();
}

module.exports = {
  getPaymentTimeoutQueue,
  getSessionExpiryQueue,
  getMacWhitelistRetryQueue,
  getSessionSyncQueue,
  closeWorkers,
};
