const express = require("express");
const router = express.Router();
const prisma = require("../config/prismaClient");
const authMiddleware = require("../middleware/authMiddleware");
const { disconnectAllUsers, disconnectByMac, getActiveDevices, getStatus } = require("../config/mikrotik");

// ✅ Get All Payments for Admin Dashboard (Protected)
router.get("/admin/payments", authMiddleware, async (req, res) => {
  db.query(
    "SELECT phone, amount, time_purchased, status FROM payments ORDER BY time_purchased DESC",
    (err, results) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      res.json({ success: true, data: results });
    }
  );
});

// ✅ Get Admin Summary (Protected)
router.get("/admin/summary", authMiddleware, async (req, res) => {
  const summaryQuery = `
        SELECT 
            (SELECT COUNT(DISTINCT phone) FROM payments WHERE status = 'completed') AS totalUsers,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') AS totalRevenue,
            0 AS activeSessions,
            (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pendingPayments
    `;

  db.query(summaryQuery, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
    res.json({ success: true, data: results[0] });
  });
});

module.exports = router;
// Users endpoints
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const { search = "", status = "all", page = 1, limit = 10 } = req.query;
    const pageNum = Number(page) || 1;
    const per = Number(limit) || 10;
    const where = {};
    if (search) {
      where.phone = { contains: search, mode: "insensitive" };
    }
    if (status !== "all") {
      where.status = status;
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (pageNum - 1) * per,
        take: per,
        orderBy: { lastSeen: "desc" },
      }),
      prisma.user.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / per));
    return res.json({ success: true, data: { users, total, page: pageNum, totalPages } });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

router.post("/users/:id/block", authMiddleware, async (req, res) => {
  // If you have a real users table, update it here. Placeholder success for now.
  return res.json({ success: true });
});

router.post("/users/:id/unblock", authMiddleware, async (req, res) => {
  return res.json({ success: true });
});

router.post("/users/:id/disconnect", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().query("SELECT mac_address AS mac FROM payments WHERE id = ? LIMIT 1", [id]);
    const mac = rows && rows[0] && rows[0].mac;
    if (!mac) return res.json({ success: true });
    const resp = await disconnectByMac(mac);
    return res.json({ success: resp.success, message: resp.message });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to disconnect user" });
  }
});

router.delete("/users/:id", authMiddleware, async (req, res) => {
  // Placeholder: implement real deletion if you have users table
  return res.json({ success: true });
});

// Transactions endpoints
router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const { search = "", status = "all", page = 1, limit = 10, startDate = null, endDate = null } = req.query;
    let sql = "SELECT transaction_id AS id, phone, amount, status, time_purchased AS timestamp, mpesa_ref FROM payments WHERE 1=1";
    const params = [];
    if (status !== "all") {
      sql += " AND status = ?";
      params.push(status);
    }
    if (startDate) {
      sql += " AND time_purchased >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND time_purchased <= ?";
      params.push(endDate);
    }
    sql += " ORDER BY time_purchased DESC";
    const [rows] = await db.promise().query(sql, params);
    let txns = rows.map((r) => ({ ...r, package: "" }));
    const q = String(search).toLowerCase();
    if (q) txns = txns.filter((t) => t.phone.toLowerCase().includes(q) || String(t.id).toLowerCase().includes(q) || String(t.mpesa_ref || '').toLowerCase().includes(q));
    const pageNum = Number(page) || 1;
    const per = Number(limit) || 10;
    const total = txns.length;
    const totalPages = Math.max(1, Math.ceil(total / per));
    const slice = txns.slice((pageNum - 1) * per, pageNum * per);
    return res.json({ success: true, data: { transactions: slice, total, page: pageNum, totalPages } });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to fetch transactions" });
  }
});

router.post("/transactions/:transactionId/refund", authMiddleware, async (req, res) => {
  // Placeholder: integrate real Mpesa reversal API if available
  return res.json({ success: false, error: "Refund not implemented" });
});

router.get("/transactions/:transactionId/receipt", authMiddleware, async (req, res) => {
  return res.json({ success: false, error: "Receipt generation not implemented" });
});

// Support endpoints
router.post("/support/contact", async (req, res) => {
  // Persist to a support table if you add one. For now, accept and return success.
  return res.json({ success: true });
});

router.get("/support/requests", authMiddleware, async (req, res) => {
  return res.json({ success: true, data: { requests: [], total: 0, page: 1, totalPages: 1 } });
});

// Logs endpoints
router.get("/system/logs", authMiddleware, async (req, res) => {
  // Placeholder: read server logs if you have a file logger integrated
  return res.json({ success: true, data: [] });
});

// Network endpoints
router.get("/network/devices", authMiddleware, async (req, res) => {
  const resp = await getActiveDevices();
  if (!resp.success) return res.status(500).json({ success: false, error: resp.error });
  return res.json({ success: true, data: resp.data });
});

router.post("/network/disconnect-all", authMiddleware, async (req, res) => {
  const resp = await disconnectAllUsers();
  return res.json({ success: resp.success, message: resp.message });
});

router.get("/network/status", authMiddleware, async (req, res) => {
  const resp = await getStatus();
  if (!resp.success) return res.status(500).json({ success: false, error: resp.error });
  return res.json({ success: true, data: resp.data });
});
