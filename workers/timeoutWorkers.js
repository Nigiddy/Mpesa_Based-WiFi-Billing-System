const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const prisma = require('../config/prismaClient');
const { PaymentStatus } = require('@prisma/client');
const { disconnectByMac, whitelistMAC, getActiveMACSet, getActiveDevices } = require('../config/mikrotik');
const { logAudit } = require('../utils/auditLogger');

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// --- Payment Timeout Worker ---
const paymentTimeoutQueue = new Queue('payment-timeout', { connection });

const paymentTimeoutWorker = new Worker('payment-timeout', async (job) => {
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
}, { connection });

paymentTimeoutWorker.on('failed', (job, error) => {
  console.error(`🚨 [Payment Timeout Worker] Job ${job.id} for transaction ${job.data.transactionId} failed permanently.`, error);
  logAudit('PAYMENT_TIMEOUT_WORKER_FAILURE', {
    jobId: job.id,
    transactionId: job.data.transactionId,
    error: error.message,
  });
});


// --- Session Expiry Worker ---
const sessionExpiryQueue = new Queue('session-expiry', { connection });

const sessionExpiryWorker = new Worker('session-expiry', async (job) => {
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
}, { connection });

sessionExpiryWorker.on('failed', (job, error) => {
  console.error(`🚨 [Session Expiry Worker] Job ${job.id} for MAC ${job.data.macAddress} failed permanently.`, error);
  logAudit('SESSION_EXPIRY_WORKER_FAILURE', {
    jobId: job.id,
    sessionId: job.data.sessionId,
    macAddress: job.data.macAddress,
    error: error.message,
  });
});


// --- MAC Whitelist Retry Worker ---
const macWhitelistRetryQueue = new Queue('mac-whitelist-retry', { connection });

const macWhitelistRetryWorker = new Worker('mac-whitelist-retry', async (job) => {
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
}, { connection });

macWhitelistRetryWorker.on('failed', (job, error) => {
  console.error(`🚨 [MAC Retry Worker] Job ${job.id} for payment ${job.data.paymentId} failed permanently.`, error);
  logAudit('MAC_WHITELIST_RETRY_FAILURE', {
    jobId: job.id,
    paymentId: job.data.paymentId,
    error: error.message,
  });
});


// --- Exporter ---
function getPaymentTimeoutQueue() {
  return paymentTimeoutQueue;
}

function getSessionExpiryQueue() {
  return sessionExpiryQueue;
}

function getMacWhitelistRetryQueue() {
  return macWhitelistRetryQueue;
}

// --- Session Sync Worker (Inactivity / Data Cap) ---
//
// Runs every 2 minutes. Compares DB active sessions against MikroTik's
// live hotspot active list. Any session whose MAC is no longer active on
// the router (kicked by idle-timeout or data cap) is marked disconnected.
// Also enforces application-level data caps for extra safety.
//
const sessionSyncQueue = new Queue('session-sync', { connection });

// Schedule one repeatable sync job if not already scheduled
(async () => {
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

const sessionSyncWorker = new Worker(
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

    // 2. Get the set of MACs currently active on MikroTik
    const { success, macs: activeMACsOnRouter } = await getActiveMACSet();

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
        // Device was kicked by MikroTik (idle-timeout or data cap)
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
    const { getPackageByPlanKey } = require('../lib/packages');
    const devicesResult = await getActiveDevices();
    if (devicesResult.success) {
      for (const device of devicesResult.data) {
        const mac = (device.macAddress || '').toUpperCase();
        const session = activeSessions.find((s) => s.macAddress.toUpperCase() === mac);
        if (!session) continue;

        // Retrieve the linked payment to find the plan
        const payment = await prisma.payment.findFirst({
          where: { macAddress: mac, status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          select: { amount: true },
        });
        if (!payment) continue;

        const { getPackageByAmount } = require('../lib/packages');
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
  { connection }
);

sessionSyncWorker.on('failed', (job, err) => {
  console.error('[Session Sync] Job failed:', err.message);
  logAudit('SESSION_SYNC_WORKER_FAILURE', { error: err.message });
});

function getSessionSyncQueue() {
  return sessionSyncQueue;
}

module.exports = {
  getPaymentTimeoutQueue,
  getSessionExpiryQueue,
  getMacWhitelistRetryQueue,
  getSessionSyncQueue,
};
