/**
 * GET /api/vouchers/:code/status  (Public)
 *
 * Returns whether a voucher code is valid without consuming it.
 * Safe to call before presenting the redemption form to the user.
 */

const express = require('express');
const prisma = require('../../config/prismaClient');
const { deriveVoucherStatus } = require('./helpers');

const router = express.Router();

router.get('/:code/status', async (req, res) => {
  try {
    const { code } = req.params;
    const voucher = await prisma.voucher.findUnique({ where: { code: code.toUpperCase() } });

    if (!voucher) {
      return res.status(404).json({ success: false, error: 'Voucher not found' });
    }

    const status = deriveVoucherStatus(voucher);
    return res.json({
      success: true,
      data: {
        code: voucher.code,
        planKey: voucher.planKey,
        durationMs: voucher.durationMs,
        status,
        expiresAt: voucher.expiresAt,
        usesRemaining: voucher.maxUses - voucher.currentUses,
      },
    });
  } catch (error) {
    console.error('❌ /vouchers/:code/status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to check voucher' });
  }
});

module.exports = router;
