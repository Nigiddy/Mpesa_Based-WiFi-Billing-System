/**
 * POST /api/vouchers/redeem  (Public — rate-limited)
 *
 * Body: { code: string, macAddress: string }
 *
 * Flow:
 *  1. Reject if MAC already has an active session (prevents session stacking)
 *  2. Look up the voucher and validate it isn't expired/fully-used
 *  3. Atomically increment currentUses + record VoucherRedemption (DB transaction)
 *  4. Whitelist the MAC address on MikroTik for the plan duration
 *  5. Create a Session record and schedule a BullMQ expiry job
 */

const express = require('express');
const prisma = require('../../config/prismaClient');
const { paymentLimiter } = require('../../middleware/rateLimit');
const { logAudit } = require('../../utils/auditLogger');
const { PACKAGES, getPackageByPlanKey } = require('../../lib/packages');
const { whitelistMAC } = require('../../config/mikrotik');
const { checkMACAlreadyActive } = require('../../services/MACAddressService');
const { getSessionExpiryQueue } = require('../../workers/timeoutWorkers');
const { deriveVoucherStatus } = require('./helpers');
const { verifyMACvsARP } = require('../../utils/arpLookup');

const router = express.Router();

router.post('/redeem', paymentLimiter, async (req, res) => {
  try {
    const { code, macAddress } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Voucher code is required' });
    }
    if (!macAddress || typeof macAddress !== 'string') {
      return res.status(400).json({ success: false, error: 'MAC address is required' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedMAC  = macAddress.trim().toUpperCase();
    const clientIP =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';

    // 🔍 ARP cross-check: verify MAC matches router ARP entry for this IP.
    const arpResult = await verifyMACvsARP(req.ip, normalizedMAC);
    if (arpResult.reason === 'mismatch') {
      console.warn(`⚠️  Voucher MAC mismatch for ${req.ip}: submitted=${normalizedMAC}, arp=${arpResult.arpMAC}`);
      logAudit('voucher_mac_arp_mismatch', {
        ip: req.ip,
        submittedMAC: normalizedMAC,
        arpMAC: arpResult.arpMAC,
      });
      return res.status(400).json({
        success: false,
        error: 'MAC address verification failed',
        message: 'The MAC address provided does not match your device. Please reconnect to the Wi-Fi and try again.',
      });
    }

    // ── 0. Reject if MAC already has an active session ─────────────────────
    const activeCheck = await checkMACAlreadyActive(normalizedMAC);
    if (activeCheck.hasActiveSession) {
      return res.status(409).json({
        success: false,
        error: 'This device already has an active session.',
        expiresAt: activeCheck.expiresAt,
      });
    }

    // ── 1. Fetch & validate voucher ────────────────────────────────────────
    const voucher = await prisma.voucher.findUnique({ where: { code: normalizedCode } });

    if (!voucher) {
      return res.status(404).json({ success: false, error: 'Voucher not found' });
    }

    const status = deriveVoucherStatus(voucher);

    if (status === 'expired') {
      return res.status(410).json({
        success: false,
        error: 'This voucher has expired',
        expiredAt: voucher.expiresAt,
      });
    }

    if (status === 'fully_used') {
      return res.status(410).json({
        success: false,
        error: 'This voucher has already been fully used',
      });
    }

    // Resolve the package for this planKey (for data cap + duration)
    const pkg = getPackageByPlanKey(voucher.planKey);
    const durationMs = pkg ? pkg.duration : Number(voucher.durationMs);

    // ── 2. Atomic DB update ────────────────────────────────────────────────
    let redemption;
    try {
      redemption = await prisma.$transaction(async (tx) => {
        // Re-read inside transaction (guards against race conditions)
        const locked = await tx.voucher.findUnique({ where: { code: normalizedCode } });

        if (locked.currentUses >= locked.maxUses) {
          throw { code: 'FULLY_USED' };
        }

        await tx.voucher.update({
          where: { id: locked.id },
          data: { currentUses: { increment: 1 } },
        });

        return tx.voucherRedemption.create({
          data: {
            voucherId:  locked.id,
            macAddress: normalizedMAC,
            ipAddress:  clientIP,
          },
        });
      });
    } catch (txError) {
      if (txError?.code === 'FULLY_USED') {
        return res.status(410).json({
          success: false,
          error: 'This voucher was just used by another request',
        });
      }
      throw txError;
    }

    // ── 3. Whitelist MAC on MikroTik ───────────────────────────────────────
    const mikrotikResult = await whitelistMAC(normalizedMAC, voucher.planKey, pkg);

    logAudit('voucher_redeemed', {
      code: normalizedCode,
      macAddress: normalizedMAC,
      ip: clientIP,
      planKey: voucher.planKey,
      mikrotikSuccess: mikrotikResult.success,
    });

    if (!mikrotikResult.success) {
      console.error(`⚠️ Voucher redeemed but MAC whitelist failed: ${mikrotikResult.message}`);
    }

    // ── 4. Create Session record & schedule expiry job ─────────────────────
    const expiryTime = new Date(Date.now() + durationMs);
    let newSession = null;

    try {
      newSession = await prisma.session.create({
        data: {
          // userId is intentionally null for voucher sessions (no phone / user)
          macAddress:           normalizedMAC,
          ipAddress:            clientIP,
          expiryTime,
          startTime:            new Date(),
          voucherRedemptionId:  redemption.id,
        },
      });

      // Schedule BullMQ delayed job to disconnect on expiry
      const sessionExpiryQueue = getSessionExpiryQueue();
      const delay = expiryTime.getTime() - Date.now();
      if (sessionExpiryQueue && delay > 0) {
        await sessionExpiryQueue.add(
          'expire-session',
          { sessionId: newSession.id, macAddress: normalizedMAC },
          {
            delay,
            jobId: `session-expiry-${newSession.id}`,
            removeOnComplete: true,
          }
        );
        console.log(`[Voucher] Expiry job scheduled for session ${newSession.id} at ${expiryTime.toISOString()}`);
      }
    } catch (sessionErr) {
      // Session tracking failure should not block the user from connecting
      console.error('⚠️ Failed to create voucher session record:', sessionErr.message);
      logAudit('voucher_session_create_failed', {
        redemptionId: redemption.id,
        macAddress: normalizedMAC,
        error: sessionErr.message,
      });
    }

    // ── 5. Respond ─────────────────────────────────────────────────────────
    if (!mikrotikResult.success) {
      return res.status(207).json({
        success: true,
        warning: 'Voucher accepted but network access could not be granted automatically. Please contact support.',
        data: {
          code:        normalizedCode,
          planKey:     voucher.planKey,
          durationMs,
          redemptionId: redemption.id,
        },
      });
    }

    return res.json({
      success: true,
      message: `Access granted for ${voucher.planKey}`,
      data: {
        code:         normalizedCode,
        planKey:      voucher.planKey,
        durationMs,
        expiresAt:    expiryTime,
        redemptionId: redemption.id,
        sessionId:    newSession?.id || null,
      },
    });
  } catch (error) {
    console.error('❌ /vouchers/redeem error:', error);
    return res.status(500).json({ success: false, error: 'Failed to redeem voucher' });
  }
});

module.exports = router;
