/**
 * Payment Timeout Worker
 * Runs every 60 seconds to check for and timeout pending payments
 * Payments that are pending for more than 5 minutes are marked as EXPIRED
 */

const prisma = require('../config/prismaClient');
const { logAudit } = require('../utils/auditLogger');

const PAYMENT_TIMEOUT_MINUTES = 5;  // Mark payment expired after 5 minutes if still pending

/**
 * Check and timeout stalled payments
 */
async function checkPaymentTimeouts() {
  try {
    console.log('💰 [Payment Timeout Worker] Running payment timeout check...');
    
    // Calculate cutoff time: 5 minutes ago
    const cutoffTime = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000);
    
    // Find all payments that are still PENDING and older than 5 minutes
    const stalledPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        requestedAt: {
          lte: cutoffTime  // Requested before cutoff time
        },
        // Also ensure it wasn't recently updated (avoid race conditions)
        updatedAt: {
          lte: cutoffTime
        }
      },
      select: {
        id: true,
        transactionId: true,
        phone: true,
        mpesaRef: true,
        requestedAt: true,
        amount: true
      },
      take: 100  // Process max 100 payments per run to avoid overload
    });

    if (stalledPayments.length === 0) {
      console.log('✅ [Payment Timeout Worker] No stalled payments found');
      return;
    }

    console.log(`⏱️  [Payment Timeout Worker] Found ${stalledPayments.length} stalled payment(s). Timing out...`);

    let timeoutCount = 0;
    let errorCount = 0;

    // Process each stalled payment
    for (const payment of stalledPayments) {
      try {
        // Use Prisma transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
          // Update payment status to EXPIRED
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'EXPIRED',
              failedAt: new Date()  // Mark when it failed
            }
          });

          // Create audit trail entry
          await tx.paymentStatusUpdate.create({
            data: {
              paymentId: payment.id,
              oldStatus: 'PENDING',
              newStatus: 'EXPIRED',
              reason: `Auto-timeout: No M-Pesa confirmation after ${PAYMENT_TIMEOUT_MINUTES} minutes`,
              changedBy: 'system',  // Indicates automatic system action
              changedAt: new Date()
            }
          });
        });

        timeoutCount++;
        console.log(`  ⏱️  Payment ${payment.id} (Txn: ${payment.transactionId}, Phone: ${payment.phone}) marked as EXPIRED`);

        // Log audit trail
        logAudit('PAYMENT_TIMEOUT_AUTO', {
          paymentId: payment.id,
          transactionId: payment.transactionId,
          phone: payment.phone,
          amount: payment.amount,
          mpesaRef: payment.mpesaRef,
          requestedAt: payment.requestedAt,
          timeoutAfterMinutes: PAYMENT_TIMEOUT_MINUTES,
          timestamp: new Date().toISOString()
        });

      } catch (paymentError) {
        errorCount++;
        console.error(`  ❌ Error timing out payment ${payment.id}:`, paymentError.message);
        logAudit('PAYMENT_TIMEOUT_ERROR', {
          paymentId: payment.id,
          transactionId: payment.transactionId,
          error: paymentError.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log(`📊 [Payment Timeout Worker] Complete: ${timeoutCount} timed out, ${errorCount} errors`);

    if (errorCount > 0) {
      logAudit('PAYMENT_TIMEOUT_PARTIAL_FAILURE', {
        processed: stalledPayments.length,
        timedOut: timeoutCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ [Payment Timeout Worker] Fatal error:', error);
    logAudit('PAYMENT_TIMEOUT_WORKER_ERROR', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Start the payment timeout worker with interval
 * Runs every 60 seconds
 */
function startPaymentTimeoutWorker() {
  console.log(`🚀 [Payment Timeout Worker] Starting worker (interval: 60s, timeout: ${PAYMENT_TIMEOUT_MINUTES}m)`);
  
  // Run immediately on start
  checkPaymentTimeouts();
  
  // Then run every 60 seconds
  const intervalId = setInterval(checkPaymentTimeouts, 60 * 1000);
  
  return intervalId;
}

/**
 * Stop the payment timeout worker
 */
function stopPaymentTimeoutWorker(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('⏹️  [Payment Timeout Worker] Stopped');
  }
}

module.exports = {
  checkPaymentTimeouts,
  startPaymentTimeoutWorker,
  stopPaymentTimeoutWorker
};
