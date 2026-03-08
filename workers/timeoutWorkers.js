const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const prisma = require('../config/prismaClient');
const { PaymentStatus } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const { disconnectByMac } = require('../config/mikrotik');

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
    // This is a safety check. If the payment was completed, its status would have changed.
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
  }
}, { connection });


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
  }
}, { connection });


// --- Exporter ---
function getPaymentTimeoutQueue() {
  return paymentTimeoutQueue;
}

function getSessionExpiryQueue() {
  return sessionExpiryQueue;
}

module.exports = {
  getPaymentTimeoutQueue,
  getSessionExpiryQueue,
  // We don't need to export the workers themselves, just the queues
  // The workers will be initialized in index.js
};
