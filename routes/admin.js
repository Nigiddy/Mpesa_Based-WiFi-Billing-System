const express = require("express");
const router = express.Router();
const prisma = require("../config/prismaClient");
const authMiddleware = require("../middleware/authMiddleware");
const { disconnectAllUsers, disconnectByMac, getActiveDevices, getStatus } = require("../config/mikrotik");
const { csrfProtection, attachCSRFToken } = require("../middleware/csrfMiddleware");
const { logAudit } = require("../utils/auditLogger");

// ✅ CSRF Token endpoint - GET CSRF token for admin requests
router.get("/admin/csrf-token", authMiddleware, attachCSRFToken, (req, res) => {
  res.json({ 
    success: true, 
    token: req.csrfToken(),
    message: "CSRF token generated. Include in X-CSRF-Token header for mutations."
  });
});

// ✅ Get All Payments for Admin Dashboard (Protected)
router.get("/admin/payments", authMiddleware, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      select: {
        phone: true,
        amount: true,
        requestedAt: true,
        status: true
      },
      orderBy: { requestedAt: 'desc' }
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ✅ Get Admin Summary (Protected)
router.get("/admin/summary", authMiddleware, async (req, res) => {
  try {
    const [totalUsers, totalRevenue, pendingPayments] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        distinct: ['phone'],
        select: { phone: true }
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.payment.count({
        where: { status: 'PENDING' }
      })
    ]);

    res.json({ success: true, data: {
      totalUsers: totalUsers.length,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeSessions: 0,
      pendingPayments: pendingPayments
    }});
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

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

router.post("/users/:id/block", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    // Update user status to BLOCKED
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { status: 'BLOCKED', blockedReason: 'Admin imposed block' }
    });

    // Log admin action
    logAudit('ADMIN_BLOCK_USER', { 
      adminId, 
      userId: id, 
      timestamp: new Date().toISOString() 
    });

    res.json({ success: true, message: `User ${id} blocked` });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ success: false, error: "Failed to block user" });
  }
});

router.post("/users/:id/unblock", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    // Update user status back to ACTIVE
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { status: 'ACTIVE', blockedReason: null }
    });

    // Log admin action
    logAudit('ADMIN_UNBLOCK_USER', { 
      adminId, 
      userId: id, 
      timestamp: new Date().toISOString() 
    });

    res.json({ success: true, message: `User ${id} unblocked` });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({ success: false, error: "Failed to unblock user" });
  }
});

router.post("/users/:id/disconnect", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      select: { macAddress: true }
    });
    
    if (!payment?.macAddress) {
      return res.json({ success: true, message: "No MAC address found" });
    }
    
    const resp = await disconnectByMac(payment.macAddress);
    
    // Log admin action
    logAudit('ADMIN_DISCONNECT_USER', { 
      adminId, 
      paymentId: id, 
      macAddress: payment.macAddress,
      reason: 'Admin disconnect',
      timestamp: new Date().toISOString() 
    });

    return res.json({ success: resp.success, message: resp.message });
  } catch (error) {
    console.error("Disconnect error:", error);
    return res.status(500).json({ success: false, error: "Failed to disconnect user" });
  }
});

router.delete("/users/:id", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    // Mark user as inactive instead of hard delete (preserves audit trail)
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { status: 'INACTIVE' }
    });

    // Log admin action
    logAudit('ADMIN_DELETE_USER', { 
      adminId, 
      userId: id, 
      timestamp: new Date().toISOString() 
    });

    return res.json({ success: true, message: `User ${id} marked as inactive` });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

// Transactions endpoints
router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const { search = "", status = "all", page = 1, limit = 10, startDate = null, endDate = null } = req.query;
    
    const where = {};
    if (status !== "all") {
      where.status = status;
    }
    if (startDate) {
      where.requestedAt = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.requestedAt = where.requestedAt ? 
        { ...where.requestedAt, lte: new Date(endDate) } : 
        { lte: new Date(endDate) };
    }

    const pageNum = Number(page) || 1;
    const per = Number(limit) || 10;

    let transactions = await prisma.payment.findMany({
      where,
      select: {
        id: true,
        phone: true,
        amount: true,
        status: true,
        requestedAt: true,
        mpesaRef: true
      },
      orderBy: { requestedAt: 'desc' },
      skip: (pageNum - 1) * per,
      take: per
    });

    const total = await prisma.payment.count({ where });
    
    // Client-side search filtering
    const q = String(search).toLowerCase();
    if (q) {
      transactions = transactions.filter((t) => 
        t.phone.toLowerCase().includes(q) || 
        String(t.id).toLowerCase().includes(q) || 
        String(t.mpesaRef || '').toLowerCase().includes(q)
      );
    }

    const totalPages = Math.max(1, Math.ceil(total / per));
    return res.json({ success: true, data: { transactions, total, page: pageNum, totalPages } });
  } catch (error) {
    console.error("Transaction fetch error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch transactions" });
  }
});

router.post("/transactions/:transactionId/refund", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.user?.id;

    // Log refund attempt
    logAudit('ADMIN_REQUEST_REFUND', { 
      adminId, 
      transactionId,
      timestamp: new Date().toISOString() 
    });

    // Placeholder: integrate real Mpesa reversal API if available
    res.json({ success: false, error: "Refund not implemented" });
  } catch (error) {
    console.error("Refund error:", error);
    res.status(500).json({ success: false, error: "Failed to process refund" });
  }
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

router.post("/network/disconnect-all", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const adminId = req.user?.id;
    const resp = await disconnectAllUsers();
    
    // Log admin action
    logAudit('ADMIN_DISCONNECT_ALL_USERS', { 
      adminId,
      affectedUsers: 'all',
      timestamp: new Date().toISOString() 
    });

    return res.json({ success: resp.success, message: resp.message });
  } catch (error) {
    console.error("Disconnect all error:", error);
    return res.status(500).json({ success: false, error: "Failed to disconnect all users" });
  }
});

router.get("/network/status", authMiddleware, async (req, res) => {
  const resp = await getStatus();
  if (!resp.success) return res.status(500).json({ success: false, error: resp.error });
  return res.json({ success: true, data: resp.data });
});

module.exports = router;
