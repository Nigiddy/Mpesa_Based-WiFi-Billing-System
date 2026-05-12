/**
 * GET /api/vouchers  (Admin only)
 *
 * Query params:
 *   status  – 'unused' | 'active' | 'fully_used' | 'expired'  (optional filter)
 *   page    – page number   (default 1)
 *   limit   – results/page  (default 50, max 200)
 */

const express = require('express');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/prismaClient');
const authMiddleware = require('../../middleware/authMiddleware');
const { deriveVoucherStatus } = require('./helpers');

const router = express.Router();

function isSchemaInitializationError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes("doesn't exist") ||
    message.includes('does not exist') ||
    message.includes('unknown column') ||
    message.includes('table') && message.includes('doesn') ||
    (error instanceof Prisma.PrismaClientKnownRequestError && [
      'P1001', // server closed the connection or database unavailable
      'P1012', // migration not applied or relation missing
      'P2025', // record not found or relation issue
    ].includes(error.code))
  );
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const page         = Math.max(1, Number(req.query.page)  || 1);
    const limit        = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip         = (page - 1) * limit;
    const statusFilter = req.query.status; // applied in-memory after enrichment

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          redemptions: {
            select: { id: true, macAddress: true, ipAddress: true, redeemedAt: true },
          },
        },
      }),
      prisma.voucher.count(),
    ]);

    const enriched = vouchers.map((v) => ({ ...v, status: deriveVoucherStatus(v) }));
    const filtered = statusFilter ? enriched.filter((v) => v.status === statusFilter) : enriched;

    return res.json({
      success: true,
      data: { vouchers: filtered, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('❌ /vouchers list error:', error);

    if (isSchemaInitializationError(error)) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch vouchers: database schema not initialized. Run Prisma migrations or prisma db push and ensure the Voucher tables exist.',
      });
    }

    return res.status(500).json({ success: false, error: 'Failed to fetch vouchers' });
  }
});

module.exports = router;
