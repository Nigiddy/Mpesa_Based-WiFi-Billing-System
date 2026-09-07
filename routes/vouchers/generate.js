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
// M-5 FIX: serializeBigInts is now imported from the shared helpers module
// instead of being duplicated here.
const { generateVoucherCode, deriveVoucherStatus, serializeBigInts } = require('./helpers');

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

    // PERF-1 FIX: Generate all codes up-front, then insert in ONE createMany() call
    // instead of issuing qty individual create() calls (500 DB round-trips → 2).
    //
    // Steps:
    //  1. Generate qty candidate codes
    //  2. Batch-check for existing codes with findMany (1 query)
    //  3. Remove collisions and regenerate if any
    //  4. Insert all valid codes with createMany (1 query)

    let candidates = Array.from({ length: qty }, () => generateVoucherCode());

    // Check for collisions in one query
    const existing = await prisma.voucher.findMany({
      where: { code: { in: candidates } },
      select: { code: true },
    });

    if (existing.length > 0) {
      const existingSet = new Set(existing.map((v) => v.code));
      // Replace collisions with fresh codes
      candidates = candidates.map((c) => {
        if (!existingSet.has(c)) return c;
        // Simple retry loop for the rare collision
        let newCode;
        let attempts = 0;
        do { newCode = generateVoucherCode(); attempts++; } while (existingSet.has(newCode) && attempts < 20);
        return newCode;
      });
    }

    const now = new Date();
    const data = candidates.map((code) => ({
      code,
      planKey,
      durationMs,
      maxUses: uses,
      currentUses: 0,
      expiresAt,
      createdBy: req.admin?.id || null,
      createdAt: now,
      updatedAt: now,
    }));

    await prisma.voucher.createMany({ data, skipDuplicates: true });

    // Fetch the created vouchers to return them with status
    const created = await prisma.voucher.findMany({
      where: { code: { in: candidates } },
      orderBy: { createdAt: 'desc' },
    });

    logAudit('vouchers_generated', { quantity: qty, planKey, maxUses: uses, expiresAt, admin: req.admin?.id });

    return res.status(201).json(serializeBigInts({
      success: true,
      message: `${created.length} voucher(s) generated`,
      data: created.map((v) => ({ ...v, status: deriveVoucherStatus(v) })),
    }));
  } catch (error) {
    console.error('❌ /vouchers/generate error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate vouchers' });
  }
});


module.exports = router;
