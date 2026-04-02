/**
 * POST /api/vouchers/redeem  (Public — rate-limited)
 *
 * Body: { code: string, macAddress: string }
 *
 * Flow:
 *  1. Look up the voucher and validate it isn't expired/fully-used
 *  2. Atomically increment currentUses + record VoucherRedemption (DB transaction)
 *  3. Whitelist the MAC address on MikroTik for the plan duration
 */

const express = require('express');
const prisma = require('../../config/prismaClient');
const { paymentLimiter } = require('../../middleware/rateLimit');
const { logAudit } = require('../../utils/auditLogger');
const { PACKAGES } = require('../../lib/packages');
const { whitelistMAC } = require('../../config/mikrotik');
const { deriveVoucherStatus } = require('./helpers');

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
    const clientIP =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';

    // ── 1. Fetch & validate ────────────────────────────────────────────────
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

    // ── 2. Atomic DB update ────────────────────────────────────────────────
    let redemption;
    try {
      redemption = await prisma.$transaction(async (tx) => {
        // Re-read inside transaction (guards against race conditions)
        const locked = await tx.voucher.findUnique({ where: { code: normalizedCode } });

        if (locked.currentUses >= locked.maxUses) {
          // Use a plain object so the outer catch can detect it cleanly
          throw { code: 'FULLY_USED' };
        }

        await tx.voucher.update({
          where: { id: locked.id },
          data: { currentUses: { increment: 1 } },
        });

        return tx.voucherRedemption.create({
          data: {
            voucherId:  locked.id,
            macAddress: macAddress.toUpperCase(),
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
    const mikrotikResult = await whitelistMAC(macAddress, voucher.planKey);

    logAudit('voucher_redeemed', {
      code: normalizedCode,
      macAddress,
      ip: clientIP,
      planKey: voucher.planKey,
      mikrotikSuccess: mikrotikResult.success,
    });

    if (!mikrotikResult.success) {
      console.error(`⚠️ Voucher redeemed but MAC whitelist failed: ${mikrotikResult.message}`);
      return res.status(207).json({
        success: true,
        warning: 'Voucher accepted but network access could not be granted automatically. Please contact support.',
        data: {
          code: normalizedCode,
          planKey: voucher.planKey,
          durationMs: voucher.durationMs,
          redemptionId: redemption.id,
        },
      });
    }

    return res.json({
      success: true,
      message: `Access granted for ${voucher.planKey}`,
      data: {
        code: normalizedCode,
        planKey: voucher.planKey,
        durationMs: voucher.durationMs,
        expiresAt: new Date(Date.now() + Number(voucher.durationMs)),
        redemptionId: redemption.id,
      },
    });
  } catch (error) {
    console.error('❌ /vouchers/redeem error:', error);
    return res.status(500).json({ success: false, error: 'Failed to redeem voucher' });
  }
});

module.exports = router;
