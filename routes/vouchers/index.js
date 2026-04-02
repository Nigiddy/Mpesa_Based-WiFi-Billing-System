/**
 * Voucher feature — route assembly
 *
 * All routes are prefixed with /api/vouchers when mounted in index.js:
 *   app.use('/api/vouchers', require('./routes/vouchers'))
 *
 * Sub-routes
 * ──────────────────────────────────────────────────────
 *  POST   /generate        – Admin: bulk-create vouchers
 *  GET    /                – Admin: list with status filter
 *  GET    /export/csv      – Admin: download CSV
 *  GET    /:code/status    – Public: check a code without redeeming
 *  POST   /redeem          – Public: redeem + whitelist MAC
 */

const express = require('express');
const router  = express.Router();

// ── Route order matters: specific paths must come before /:code/status ────────
router.use(require('./generate')); // POST /generate
router.use(require('./export'));   // GET  /export/csv   (before /:code)
router.use(require('./list'));     // GET  /
router.use(require('./status'));   // GET  /:code/status
router.use(require('./redeem'));   // POST /redeem

module.exports = router;
