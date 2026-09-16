/**
 * MAC Address Validation and Anti-Spoofing Service
 * Prevents:
 * - Invalid MAC formats
 * - MAC address reuse
 * - MAC spoofing attacks
 * - Duplicate sessions
 */

const prisma = require("../config/prismaClient");

/**
 * Validate MAC address format
 * Standard: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
 * 
 * @param {string} mac - MAC address to validate
 * @returns {Object} { valid: boolean, normalized: string, error?: string }
 */
function validateMACFormat(mac) {
  if (!mac || typeof mac !== 'string') {
    return { valid: false, error: 'MAC must be a string' };
  }

  // Normalize: uppercase and standardize separator to colon
  const normalized = mac.trim().toUpperCase().replace(/-/g, ':');

  // Validate format
  const macRegex = /^([0-9A-F]{2}:){5}([0-9A-F]{2})$/;
  if (!macRegex.test(normalized)) {
    return {
      valid: false,
      error: 'Invalid MAC format (expected: AA:BB:CC:DD:EE:FF)'
    };
  }

  // Check for unicast address (first octet should be even)
  // Multicast addresses have odd first octet - should reject those
  const firstOctet = parseInt(normalized.substring(0, 2), 16);
  const isMulticast = (firstOctet & 0x01) === 1;

  if (isMulticast) {
    return {
      valid: false,
      error: 'Multicast MAC addresses are not allowed'
    };
  }

  return { valid: true, normalized };
}

/**
 * Check if MAC already has an active session
 * Prevents: Multiple sessions from same device
 * 
 * @param {string} mac - MAC address to check
 * @returns {Promise<Object>}
 */
async function checkMACAlreadyActive(mac) {
  try {
    const activeSession = await prisma.session.findFirst({
      where: {
        macAddress: mac.toUpperCase(),
        expiryTime: { gt: new Date() }, // Not expired
        disconnectedAt: null // Still active
      },
      select: {
        id: true,
        expiryTime: true,
        ipAddress: true
      }
    });

    if (activeSession) {
      return {
        hasActiveSession: true,
        sessionId: activeSession.id,
        expiresAt: activeSession.expiryTime,
        message: `This MAC already has an active session (expires ${activeSession.expiryTime.toISOString()})`
      };
    }

    return { hasActiveSession: false };
  } catch (error) {
    console.error('Error checking MAC status:', error);
    return { hasActiveSession: false, error: error.message };
  }
}

/**
 * Check for potential spoofing
 * Detects: Same MAC from different IPs in short time
 * 
 * @param {string} mac - MAC address
 * @param {string} ip - Client IP address
 * @returns {Promise<Object>}
 */
async function detectPotentialSpoofing(mac, ip) {
  try {
    // Get all sessions for this MAC in last 30 minutes
    const recentSessions = await prisma.session.findMany({
      where: {
        macAddress: mac.toUpperCase(),
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }
      },
      select: {
        ipAddress: true,
        createdAt: true
      }
    });

    if (recentSessions.length === 0) {
      return { isSuspicious: false };
    }

    // Check if IP differs significantly from historical pattern
    const uniqueIPs = [...new Set(recentSessions.map(s => s.ipAddress))];

    if (uniqueIPs.length > 3) {
      return {
        isSuspicious: true,
        reason: 'MAC appearing from multiple different IPs',
        ipCount: uniqueIPs.length,
        ips: uniqueIPs
      };
    }

    // Check if same MAC from completely different IP in same minute
    const lastMinute = new Date(Date.now() - 60 * 1000);
    const recentFromDifferentIP = recentSessions.filter(
      s => s.ipAddress !== ip && s.createdAt > lastMinute
    );

    if (recentFromDifferentIP.length > 0) {
      return {
        isSuspicious: true,
        reason: 'MAC appearing from different IP very recently',
        previousIP: recentFromDifferentIP[0].ipAddress,
        currentIP: ip
      };
    }

    return { isSuspicious: false };
  } catch (error) {
    console.error('Error detecting spoofing:', error);
    return { isSuspicious: false, error: error.message };
  }
}

/**
 * Register a new MAC session (after payment verified)
 * 
 * IMPORTANT: This function must be called inside a prisma.$transaction().
 * It intentionally does NOT enqueue BullMQ jobs — it returns `queueJob`
 * metadata so the caller can enqueue AFTER the transaction commits.
 * Enqueueing inside a transaction is a bug: if the TX rolls back the job
 * fires for a session that was never committed.
 *
 * CONCURRENCY: The new-session path uses SELECT ... FOR UPDATE (via a raw
 * query lock) to prevent two concurrent callbacks from inserting duplicate
 * active sessions for the same MAC address.
 *
 * @param {Object} params - { mac, phone, ip, expiryDuration, paymentId }
 * @param {Object} prismaClient - Prisma transaction client (tx)
 * @returns {Promise<Object>} result including queueJob metadata
 */
async function registerOrExtendMACSession(params, prismaClient = prisma) {
  const { mac, phone, ip, expiryDuration, paymentId } = params;

  const normalizedMAC = mac.toUpperCase();

  const formatValidation = validateMACFormat(normalizedMAC);
  if (!formatValidation.valid) {
    return { success: false, error: formatValidation.error };
  }

  const activeSession = await prismaClient.session.findFirst({
    where: {
      macAddress: normalizedMAC,
      disconnectedAt: null,
      expiryTime: { gt: new Date() },
    },
  });

  if (activeSession) {
    // Extend the existing session
    const newExpiryTime = new Date(activeSession.expiryTime.getTime() + expiryDuration);
    const updatedSession = await prismaClient.session.update({
      where: { id: activeSession.id },
      data: {
        expiryTime: newExpiryTime,
        paymentId: paymentId, // Link to the new payment
      },
    });

    const jobId = `session-expiry-${activeSession.id}`;
    console.log(`✅ Session extended for ${normalizedMAC}. New expiry: ${newExpiryTime.toISOString()}`);
    return {
      success: true,
      sessionId: updatedSession.id,
      expiresAt: newExpiryTime,
      action: 'extended',
      // Caller MUST enqueue this job after the transaction commits
      queueJob: {
        action: 'reschedule',
        jobId,
        sessionId: activeSession.id,
        macAddress: normalizedMAC,
        delay: newExpiryTime.getTime() - Date.now(),
      },
    };
  } else {
    // CONCURRENCY FIX (Issue 6): Acquire a row-level lock before inserting
    // a new session so that two concurrent callbacks for the same MAC cannot
    // both pass the findFirst check above and both insert a session.
    // We lock on the User row (or a synthetic advisory key) using raw SQL.
    // MySQL: SELECT GET_LOCK('session_mac_<MAC>', 5) — releases on TX end.
    const lockKey = `session_mac_${normalizedMAC}`;
    await prismaClient.$queryRawUnsafe(
      `SELECT GET_LOCK(?, 5) AS locked`,
      lockKey
    );

    // Re-check inside the lock in case another request created a session
    // between our initial findFirst and acquiring the lock.
    const sessionAfterLock = await prismaClient.session.findFirst({
      where: {
        macAddress: normalizedMAC,
        disconnectedAt: null,
        expiryTime: { gt: new Date() },
      },
    });

    if (sessionAfterLock) {
      // Another concurrent request already created a session — extend it instead.
      const newExpiryTime = new Date(sessionAfterLock.expiryTime.getTime() + expiryDuration);
      const updatedSession = await prismaClient.session.update({
        where: { id: sessionAfterLock.id },
        data: { expiryTime: newExpiryTime, paymentId },
      });
      const jobId = `session-expiry-${sessionAfterLock.id}`;
      console.log(`✅ Session extended (post-lock) for ${normalizedMAC}. New expiry: ${newExpiryTime.toISOString()}`);
      return {
        success: true,
        sessionId: updatedSession.id,
        expiresAt: newExpiryTime,
        action: 'extended',
        queueJob: {
          action: 'reschedule',
          jobId,
          sessionId: sessionAfterLock.id,
          macAddress: normalizedMAC,
          delay: newExpiryTime.getTime() - Date.now(),
        },
      };
    }

    // BUG FIX (C-8): The original upsert was a unique-constraint trap.
    // User.macAddress is @unique. Three edge-cases must be handled:
    //
    //  a) Returning user, same device → update lastSeen + MAC (idempotent)
    //  b) Returning user, new device  → update lastSeen + MAC (device changed)
    //  c) New phone, MAC already linked to a different user → REFUSE and audit
    //     (H-2 fix: do NOT silently overwrite the existing user's phone number)
    //
    // We use a findFirst + update/create pattern inside the existing transaction
    // (prismaClient here is already `tx` when called from within $transaction).

    let user = await prismaClient.user.findUnique({ where: { phone } });

    if (user) {
      // Case a/b: Known phone — update MAC + lastSeen
      user = await prismaClient.user.update({
        where: { id: user.id },
        data: { macAddress: normalizedMAC, lastSeen: new Date(), status: 'ACTIVE' },
      });
    } else {
      // Check if the MAC is already registered to a different account
      const macOwner = await prismaClient.user.findUnique({ where: { macAddress: normalizedMAC } });
      if (macOwner) {
        // Case c (H-2): MAC is owned by a DIFFERENT phone number.
        // Silently overwriting macOwner.phone is dangerous — this could be a
        // spoofing attempt or a mis-keyed phone number.  Refuse the operation,
        // record a SUSPICIOUS_MAC_REASSIGNMENT audit event, and let the caller
        // decide how to handle it (e.g. prompt the user to contact support).
        console.warn(
          `⚠️  SUSPICIOUS: MAC ${normalizedMAC} is owned by phone ${macOwner.phone} ` +
          `but a session was requested for phone ${phone}. Refusing reassignment.`
        );
        await prismaClient.auditlog.create({
          data: {
            action: 'SUSPICIOUS_MAC_REASSIGNMENT',
            userId: macOwner.id,
            details: JSON.stringify({
              mac: normalizedMAC,
              existingPhone: macOwner.phone,
              requestedPhone: phone,
              paymentId,
              ip,
            }),
            ip,
          },
        });
        return {
          success: false,
          error: 'MAC address is registered to a different account. Please contact support.',
          code: 'MAC_OWNERSHIP_CONFLICT',
        };
      } else {
        // Brand new user on a new device
        user = await prismaClient.user.create({
          data: { phone, macAddress: normalizedMAC, status: 'ACTIVE' },
        });
      }
    }

    const newExpiryTime = new Date(Date.now() + expiryDuration);
    const newSession = await prismaClient.session.create({
      data: {
        userId: user.id,
        macAddress: normalizedMAC,
        ipAddress: ip,
        expiryTime: newExpiryTime,
        startTime: new Date(),
        paymentId,
      },
    });

    const jobId = `session-expiry-${newSession.id}`;
    const delay = newExpiryTime.getTime() - Date.now();

    console.log(`✅ New session registered for ${normalizedMAC}. Expires: ${newExpiryTime.toISOString()}`);
    return {
      success: true,
      sessionId: newSession.id,
      expiresAt: newExpiryTime,
      action: 'created',
      // Caller MUST enqueue this job after the transaction commits
      queueJob: delay > 0 ? {
        action: 'create',
        jobId,
        sessionId: newSession.id,
        macAddress: normalizedMAC,
        delay,
      } : null,
    };
  }
}


/**
 * Deregister/End a MAC session
 * 
 * @param {number} sessionId - Session to end
 * @param {string} reason - Reason for disconnection
 * @returns {Promise<Object>}
 */
async function endMACSession(sessionId, reason = 'user_request') {
  try {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        disconnectedAt: new Date(),
        reason
      }
    });

    console.log(`🔌 Session ended: ${session.macAddress} (${reason})`);

    return { success: true, session };
  } catch (error) {
    console.error('Error ending MAC session:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  validateMACFormat,
  checkMACAlreadyActive,
  detectPotentialSpoofing,
  registerOrExtendMACSession,
  endMACSession
};
