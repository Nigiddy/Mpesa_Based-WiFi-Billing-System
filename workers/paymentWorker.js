// BullMQ payment processing worker for M-Pesa callbacks
const { Worker } = require('bullmq');
const prisma = require('../config/prismaClient');
const { whitelistMAC } = require('../config/mikrotik');
const Redis = require('ioredis');

let paymentWorker = null;
let connection = null;

/**
 * Initialize payment worker (lazy-loaded)
 */
function initializePaymentWorker() {
  if (paymentWorker) return paymentWorker;

  try {
    connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    paymentWorker = new Worker('mpesa-payments', async job => {
      const { checkoutId, callbackData } = job.data;
      try {
        // Idempotency: Only process if not already completed/failed
        const payment = await prisma.payment.findUnique({
          where: { mpesaRef: checkoutId },
        });
        if (!payment) {
          console.error('❌ Transaction not found for checkout ID:', checkoutId);
          return;
        }
        if (payment.status === 'completed' || payment.status === 'failed') {
          console.log('ℹ️ Payment already processed:', payment.status);
          return;
        }
        const resultCode = callbackData?.ResultCode;
        if (resultCode !== 0) {
          await prisma.payment.update({
            where: { mpesaRef: checkoutId },
            data: { status: 'failed' }
          });
          console.log('❌ Payment failed or canceled');
          return;
        }
        const amount = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === 'Amount')?.Value;
        const mpesaRef = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
        const mac = payment.macAddress;
        let time = '1Hr';
        if (Number(amount) === 30) time = '24Hrs';
        else if (Number(amount) === 20) time = '12Hrs';
        else if (Number(amount) === 15) time = '4Hrs';
        console.log(`✅ Whitelisting MAC ${mac} for ${time}...`);
        const mikrotikResponse = await whitelistMAC(mac, time);
        if (mikrotikResponse.success) {
          await prisma.payment.update({
            where: { mpesaRef: checkoutId },
            data: {
              status: 'completed',
              mpesaRef: mpesaRef || checkoutId || null,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          });
          console.log('✅ Payment completed and MAC whitelisted');
        } else {
          console.error('❌ MikroTik Error:', mikrotikResponse.message);
        }
      } catch (error) {
        console.error('❌ Payment Worker Error:', error);
      }
    }, { connection });

    console.log('🚀 BullMQ payment worker initialized');

    // ✅ Prevent crash on unhandled worker errors
    paymentWorker.on('error', (err) => {
      console.error('❌ BullMQ Payment Worker Error:', err.message);
    });

    return paymentWorker;
  } catch (error) {
    console.warn('⚠️ Failed to initialize payment worker:', error.message);
    return null;
  }
}

module.exports = { initializePaymentWorker };
