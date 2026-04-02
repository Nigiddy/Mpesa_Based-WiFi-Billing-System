/**
 * GET /api/vouchers/export/csv  (Admin only)
 *
 * Streams all vouchers as a UTF-8 CSV download.
 * Columns: Code, Plan, Duration (ms), Max Uses, Current Uses,
 *           Status, Created At, Expires At, Redeemed By (MACs)
 */

const express = require('express');
const prisma = require('../../config/prismaClient');
const authMiddleware = require('../../middleware/authMiddleware');
const { logAudit } = require('../../utils/auditLogger');
const { deriveVoucherStatus } = require('./helpers');

const router = express.Router();

router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
      include: { redemptions: { select: { macAddress: true, redeemedAt: true } } },
    });

    const HEADER = [
      'Code', 'Plan', 'Duration (ms)', 'Max Uses', 'Current Uses',
      'Status', 'Created At', 'Expires At', 'Redeemed By (MACs)',
    ].join(',');

    const rows = vouchers.map((v) => {
      const macs = v.redemptions.map((r) => r.macAddress).join(' | ');
      return [
        v.code,
        v.planKey,
        v.durationMs,
        v.maxUses,
        v.currentUses,
        deriveVoucherStatus(v),
        v.createdAt.toISOString(),
        v.expiresAt ? v.expiresAt.toISOString() : '',
        `"${macs}"`,
      ].join(',');
    });

    const csv      = [HEADER, ...rows].join('\n');
    const filename = `vouchers_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    logAudit('vouchers_exported_csv', { count: vouchers.length, admin: req.admin?.id });
    return res.send(csv);
  } catch (error) {
    console.error('❌ /vouchers/export/csv error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export vouchers' });
  }
});

module.exports = router;
