/**
 * POST /api/vouchers/generate  (Admin only)
 *
 * Body: {
 *   planKey:       '1Hr' | '4Hrs' | '12Hrs' | '24Hrs'
 *   quantity:      number  (1–500, default 1)
 *   maxUses:       number  (default 1)
 *   expiresInDays: number  (default 30)
 * }
 */

const express = require('express');
const prisma = require('../../config/prismaClient');
const authMiddleware = require('../../middleware/authMiddleware');
const { logAudit } = require('../../utils/auditLogger');
const { PACKAGES } = require('../../lib/packages');
const { generateVoucherCode, deriveVoucherStatus } = require('./helpers');

const router = express.Router();

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const {
      planKey,
      quantity      = 1,
      maxUses       = 1,
      expiresInDays = 30,
    } = req.body;

    // Validate planKey
    const validPlanKeys = Object.values(PACKAGES).map((p) => p.timeLabel);
    if (!planKey || !validPlanKeys.includes(planKey)) {
      return res.status(400).json({
        success: false,
        error: `Invalid planKey. Must be one of: ${validPlanKeys.join(', ')}`,
      });
    }

    const qty       = Math.min(Math.max(1, Number(quantity)), 500);
    const uses      = Math.max(1, Number(maxUses));
    const expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
    const pkgEntry  = Object.values(PACKAGES).find((p) => p.timeLabel === planKey);
    const durationMs = pkgEntry.duration;

    // Bulk-create with unique codes; retry up to 5 times on collision
    const created = [];
    for (let i = 0; i < qty; i++) {
      let code;
      let attempts = 0;
      while (attempts < 5) {
        code = generateVoucherCode();
        const existing = await prisma.voucher.findUnique({ where: { code } });
        if (!existing) break;
        attempts++;
      }
      const voucher = await prisma.voucher.create({
        data: { code, planKey, durationMs, maxUses: uses, currentUses: 0, expiresAt, createdBy: req.admin?.id || null },
      });
      created.push(voucher);
    }

    logAudit('vouchers_generated', { quantity: qty, planKey, maxUses: uses, expiresAt, admin: req.admin?.id });

    return res.status(201).json({
      success: true,
      message: `${qty} voucher(s) generated`,
      data: created.map((v) => ({ ...v, status: deriveVoucherStatus(v) })),
    });
  } catch (error) {
    console.error('❌ /vouchers/generate error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate vouchers' });
  }
});

module.exports = router;
