const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const prisma = require('../config/prismaClient');
const { PaymentStatus } = require('@prisma/client');
const { disconnectByMac, whitelistMAC } = require('../config/mikrotik');
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

    const mikrotikResult = await whitelistMAC(payment.macAddress, timeLabel);

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

module.exports = {
  getPaymentTimeoutQueue,
  getSessionExpiryQueue,
  getMacWhitelistRetryQueue,
  // We don't need to export the workers themselves, just the queues
};
