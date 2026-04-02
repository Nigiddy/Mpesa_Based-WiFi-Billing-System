// BullMQ payment processing worker for M-Pesa callbacks
const { Worker } = require('bullmq');
const { PaymentStatus } = require('@prisma/client');
const prisma = require('../config/prismaClient');
const { whitelistMAC } = require('../config/mikrotik');
const { getPackageByAmount } = require('../lib/packages');
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
        // ✅ Idempotency: find payment record
        const payment = await prisma.payment.findUnique({
          where: { mpesaRef: checkoutId },
        });
        if (!payment) {
          console.error('❌ Transaction not found for checkout ID:', checkoutId);
          return;
        }

        // ✅ Guard uses Prisma enum constants — NOT lowercase string literals
        if (
          payment.status === PaymentStatus.COMPLETED ||
          payment.status === PaymentStatus.FAILED
        ) {
          console.log('ℹ️ Payment already processed:', payment.status);
          return;
        }

        // ✅ Normalise ResultCode to number before comparison
        const resultCode = Number(callbackData?.ResultCode);
        if (resultCode !== 0) {
          await prisma.payment.update({
            where: { mpesaRef: checkoutId },
            data: {
              status: PaymentStatus.FAILED,
              failedAt: new Date()
            }
          });
          console.log('❌ Payment failed or canceled, ResultCode:', resultCode);
          return;
        }

        const callbackAmount = Number(
          callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === 'Amount')?.Value
        );
        const mpesaReceipt = callbackData?.CallbackMetadata?.Item?.find(
          (item) => item.Name === 'MpesaReceiptNumber'
        )?.Value;
        const mac = payment.macAddress;

        // ✅ Derive session duration from packages lib — no hardcoded if/else
        const pkg = getPackageByAmount(callbackAmount || payment.amount);
        const timeLabel = pkg ? pkg.timeLabel : '1Hr';

        console.log(`✅ Whitelisting MAC ${mac} for ${timeLabel}...`);
        const mikrotikResponse = await whitelistMAC(mac, timeLabel, pkg);

        if (mikrotikResponse.success) {
          await prisma.payment.update({
            where: { mpesaRef: checkoutId },
            data: {
              status: PaymentStatus.COMPLETED,
              mpesaRef: mpesaReceipt || checkoutId || null,
              completedAt: new Date(),
              expiresAt: pkg
                ? new Date(Date.now() + pkg.duration)
                : new Date(Date.now() + 60 * 60 * 1000) // fallback: 1 hour
            }
          });
          console.log('✅ Payment completed and MAC whitelisted');
        } else {
          console.error('❌ MikroTik Error:', mikrotikResponse.message);
          // Do not mark as COMPLETED — leave PENDING so it can be retried
        }
      } catch (error) {
        console.error('❌ Payment Worker Error:', error);
        throw error; // re-throw so BullMQ retries the job
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

