// BullMQ queue setup for M-Pesa payment jobs
const { Queue } = require('bullmq');
const Redis = require('ioredis');

let paymentQueue = null;
let connection = null;

/**
 * Lazy load Redis connection - only connect when queue is first used
 */
function getPaymentQueue() {
  if (!paymentQueue) {
    try {
      connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
      });
      paymentQueue = new Queue('mpesa-payments', { connection });
      console.log('🔴 Redis connection established for payment queue');
    } catch (error) {
      console.warn('⚠️  Redis not available for queue - payments will be processed synchronously', error.message);
      return null;
    }
  }
  return paymentQueue;
}

module.exports = {
  getPaymentQueue,
  /**
   * For backward compatibility, export queue directly with lazy getter
   */
  get queue() {
    return getPaymentQueue();
  }
};
