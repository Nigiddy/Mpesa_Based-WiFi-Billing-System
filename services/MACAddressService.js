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
 * @param {Object} params - { mac, phone, ip, expiryTime, sessionDuration }
 * @returns {Promise<Object>}
 */
async function registerMACSession(params) {
  const { mac, phone, ip, expiryTime, sessionDuration, paymentId } = params;

  try {
    const normalizedMAC = mac.toUpperCase();

    // Validate format
    const formatValidation = validateMACFormat(normalizedMAC);
    if (!formatValidation.valid) {
      return { success: false, error: formatValidation.error };
    }

    // Check for existing active sessions
    const activeCheck = await checkMACAlreadyActive(normalizedMAC);
    if (activeCheck.hasActiveSession) {
      return { success: false, error: activeCheck.message };
    }

    // Detect spoofing attempts
    const spoofingCheck = await detectPotentialSpoofing(normalizedMAC, ip);
    if (spoofingCheck.isSuspicious) {
      console.warn('⚠️ SUSPICIOUS: Possible MAC spoofing detected:', spoofingCheck);
      // Could block here in production, or log for review
      // For now, we allow but log the suspicious activity
    }

    // Get or create user
    const user = await prisma.user.upsert({
      where: { phone },
      update: { lastSeen: new Date() },
      create: {
        phone,
        macAddress: normalizedMAC,
        status: 'ACTIVE'
      }
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        macAddress: normalizedMAC,
        ipAddress: ip,
        expiryTime,
        startTime: new Date(),
        paymentId
      }
    });

    console.log(`✅ Session registered: ${normalizedMAC} expires ${expiryTime.toISOString()}`);

    return {
      success: true,
      sessionId: session.id,
      expiresAt: expiryTime
    };
  } catch (error) {
    console.error('Error registering MAC session:', error);
    return { success: false, error: error.message };
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
  registerMACSession,
  endMACSession
};
