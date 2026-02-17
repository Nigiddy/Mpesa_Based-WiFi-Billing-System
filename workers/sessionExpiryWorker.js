/**
 * Session Expiry Worker
 * Runs every 30 seconds to check for and disconnect expired sessions
 * Gracefully updates session records with disconnection reason
 */

const prisma = require('../config/prismaClient');
const { disconnectByMac } = require('../config/mikrotik');
const { logAudit } = require('../utils/auditLogger');

/**
 * Check and disconnect expired sessions
 */
async function checkExpiredSessions() {
  try {
    console.log('📊 [Session Expiry Worker] Running session expiry check...');
    
    // Find all sessions that have expired but not yet disconnected
    const expiredSessions = await prisma.session.findMany({
      where: {
        expiryTime: {
          lte: new Date()  // Expiry time is before now
        },
        disconnectedAt: null  // Not yet disconnected
      },
      select: {
        id: true,
        macAddress: true,
        userId: true,
        user: { select: { phone: true } }
      },
      take: 100  // Process max 100 sessions per run to avoid overload
    });

    if (expiredSessions.length === 0) {
      console.log('✅ [Session Expiry Worker] No expired sessions found');
      return;
    }

    console.log(`⏱️  [Session Expiry Worker] Found ${expiredSessions.length} expired session(s). Disconnecting...`);

    let successCount = 0;
    let failureCount = 0;

    // Process each expired session
    for (const session of expiredSessions) {
      try {
        // Disconnect from MikroTik
        const resp = await disconnectByMac(session.macAddress);
        
        // Update session record with disconnection timestamp and reason
        await prisma.session.update({
          where: { id: session.id },
          data: {
            disconnectedAt: new Date(),
            reason: 'EXPIRED'  // Mark as expired reason
          }
        });

        // Log audit trail
        logAudit('SESSION_EXPIRED_AUTO_DISCONNECT', {
          sessionId: session.id,
          userId: session.userId,
          phone: session.user?.phone,
          macAddress: session.macAddress,
          disconnectSuccess: resp.success,
          timestamp: new Date().toISOString()
        });

        if (resp.success) {
          successCount++;
          console.log(`  ✅ Session ${session.id} (MAC: ${session.macAddress}) disconnected`);
        } else {
          failureCount++;
          console.log(`  ⚠️  Session ${session.id} (MAC: ${session.macAddress}) database updated but router disconnect failed`);
        }
      } catch (sessionError) {
        failureCount++;
        console.error(`  ❌ Error processing session ${session.id}:`, sessionError.message);
        
        // Still try to update database to mark as disconnected
        try {
          await prisma.session.update({
            where: { id: session.id },
            data: {
              disconnectedAt: new Date(),
              reason: 'EXPIRED_ERROR'  // Mark as expired with error
            }
          });
        } catch (updateError) {
          console.error(`  ❌ Failed to update session ${session.id}:`, updateError.message);
        }
      }
    }

    console.log(`📊 [Session Expiry Worker] Complete: ${successCount} success, ${failureCount} failed`);
    
    if (failureCount > 0) {
      logAudit('SESSION_EXPIRY_PARTIAL_FAILURE', {
        processed: expiredSessions.length,
        successful: successCount,
        failed: failureCount,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ [Session Expiry Worker] Fatal error:', error);
    logAudit('SESSION_EXPIRY_WORKER_ERROR', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Start the session expiry worker with interval
 * Runs every 30 seconds
 */
function startSessionExpiryWorker() {
  console.log('🚀 [Session Expiry Worker] Starting worker (interval: 30s)');
  
  // Run immediately on start
  checkExpiredSessions();
  
  // Then run every 30 seconds
  const intervalId = setInterval(checkExpiredSessions, 30 * 1000);
  
  return intervalId;
}

/**
 * Stop the session expiry worker
 */
function stopSessionExpiryWorker(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('⏹️  [Session Expiry Worker] Stopped');
  }
}

module.exports = {
  checkExpiredSessions,
  startSessionExpiryWorker,
  stopSessionExpiryWorker
};
