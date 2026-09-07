// BullMQ queue setup for M-Pesa payment jobs
const { Queue } = require('bullmq');
// BOOT-5 FIX: Use shared Redis singleton instead of creating a private connection
const { getRedisClient } = require('./redis');

let paymentQueue = null;

/**
 * Returns the BullMQ payment queue, creating it lazily on first call.
 * Returns null if Redis is unavailable — callers fall back to synchronous processing.
 */
function getPaymentQueue() {
  if (!paymentQueue) {
    try {
      const connection = getRedisClient();
      if (!connection) {
        console.warn('⚠️  Redis not available — payment queue not created. Payments will be processed synchronously.');
        return null;
      }
      paymentQueue = new Queue('mpesa-payments', { connection });
      console.log('✅ Payment queue initialised (Redis connected)');
    } catch (error) {
      console.warn('⚠️  Failed to create payment queue:', error.message);
      return null;
    }
  }
  return paymentQueue;
}

module.exports = {
  getPaymentQueue,
  /**
   * For backward compatibility — lazy getter via property accessor.
   */
  get queue() {
    return getPaymentQueue();
  }
};

