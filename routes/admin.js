const express = require("express");
const router = express.Router();
const prisma = require("../config/prismaClient");
const authMiddleware = require("../middleware/authMiddleware");
const { disconnectAllUsers, disconnectByMac, getActiveDevices, getStatus } = require("../config/mikrotik");
const { csrfProtection, attachCSRFToken } = require("../middleware/csrfMiddleware");
const { logAudit } = require("../utils/auditLogger");

function formatCsvValue(value) {
  if (value === null || value === undefined) return ""
  const text = String(value)
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

// ✅ CSRF Token endpoint - GET CSRF token for admin requests
router.get("/admin/csrf-token", authMiddleware, attachCSRFToken, (req, res) => {
  res.json({ 
    success: true, 
    data: { token: req.csrfToken() },
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

// ✅ Get Admin Summary (Protected) — FIXED: Now calculates successRate and blockedUsers
router.get("/admin/summary", authMiddleware, async (req, res) => {
  try {
    const [
      totalUsers,
      totalRevenue,
      pendingPayments,
      completedPayments,
      totalPayments,
      blockedUsers,
      activeSessions
    ] = await Promise.all([
      // Total unique users (by phone)
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        distinct: ['phone'],
        select: { phone: true }
      }),
      // Total revenue from completed payments
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      // Count pending payments
      prisma.payment.count({
        where: { status: 'PENDING' }
      }),
      // Count completed payments
      prisma.payment.count({
        where: { status: 'COMPLETED' }
      }),
      // Count total payments (for success rate calculation)
      prisma.payment.count({}),
      // Count blocked users
      prisma.user.count({
        where: { status: 'BLOCKED' }
      }),
      // Count active sessions
      prisma.session.count({
        where: {
          disconnectedAt: null,
          expiryTime: { gt: new Date() }
        }
      })
    ]);

    // Calculate success rate: (completed / total) * 100
    const successRate = totalPayments > 0 ? Math.round((completedPayments / totalPayments) * 100) : 0;

    res.json({ success: true, data: {
      totalUsers: totalUsers.length,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeSessions: activeSessions,
      pendingPayments: pendingPayments,
      successRate: successRate,
      blockedUsers: blockedUsers
    }});
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Users export endpoint
router.get("/users/export/csv", authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    const header = [
      'ID',
      'Phone',
      'MAC Address',
      'Status',
      'Total Spent',
      'Sessions Count',
      'Last Seen',
      'Blocked Reason',
      'Created At',
      'Updated At',
    ].join(',');

    const rows = users.map((user) => [
      formatCsvValue(user.id),
      formatCsvValue(user.phone),
      formatCsvValue(user.macAddress),
      formatCsvValue(user.status),
      formatCsvValue(user.totalSpent),
      formatCsvValue(user.sessionsCount),
      formatCsvValue(user.lastSeen ? user.lastSeen.toISOString() : ''),
      formatCsvValue(user.blockedReason || ''),
      formatCsvValue(user.createdAt.toISOString()),
      formatCsvValue(user.updatedAt.toISOString()),
    ].join(','));

    const csv = [header, ...rows].join('\n');
    const filename = `users_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    logAudit('users_exported_csv', { count: users.length, admin: req.admin?.id });
    return res.send(csv);
  } catch (error) {
    console.error('❌ /users/export/csv error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export users' });
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
    const adminId = req.admin?.id;

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
    const adminId = req.admin?.id;

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
    const adminId = req.admin?.id;
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
    const adminId = req.admin?.id;

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
router.get("/transactions/export/csv", authMiddleware, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({ orderBy: { requestedAt: 'desc' } });
    const header = [
      'Transaction ID',
      'Phone',
      'Amount',
      'Status',
      'M-Pesa Reference',
      'M-Pesa Receipt',
      'MAC Address',
      'IP Address',
      'Requested At',
      'Completed At',
      'Refunded Amount',
      'Refund Reason',
      'Refunded At',
      'Created At',
      'Updated At',
    ].join(',');

    const rows = payments.map((payment) => [
      formatCsvValue(payment.transactionId),
      formatCsvValue(payment.phone),
      formatCsvValue(payment.amount),
      formatCsvValue(payment.status),
      formatCsvValue(payment.mpesaRef || ''),
      formatCsvValue(payment.mpesaReceipt || ''),
      formatCsvValue(payment.macAddress),
      formatCsvValue(payment.ipAddress || ''),
      formatCsvValue(payment.requestedAt.toISOString()),
      formatCsvValue(payment.completedAt ? payment.completedAt.toISOString() : ''),
      formatCsvValue(payment.refundedAmount ?? ''),
      formatCsvValue(payment.refundReason || ''),
      formatCsvValue(payment.refundedAt ? payment.refundedAt.toISOString() : ''),
      formatCsvValue(payment.createdAt.toISOString()),
      formatCsvValue(payment.updatedAt.toISOString()),
    ].join(','));

    const csv = [header, ...rows].join('\n');
    const filename = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    logAudit('transactions_exported_csv', { count: payments.length, admin: req.admin?.id });
    return res.send(csv);
  } catch (error) {
    console.error('❌ /transactions/export/csv error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export transactions' });
  }
});

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
    const adminId = req.admin?.id;

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
  try {
    const { transactionId } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: {
        transactionId: true,
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }

    return res.json({
      success: true,
      data: {
        receiptUrl: `/api/transactions/${encodeURIComponent(transactionId)}/receipt/download`
      }
    });
  } catch (error) {
    console.error("Receipt link error:", error);
    return res.status(500).json({ success: false, error: "Failed to generate receipt URL" });
  }
});

router.get("/transactions/:transactionId/receipt/download", authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: {
        transactionId: true,
        phone: true,
        amount: true,
        status: true,
        mpesaRef: true,
        mpesaReceipt: true,
        macAddress: true,
        ipAddress: true,
        requestedAt: true,
        completedAt: true,
        refundedAmount: true,
        refundReason: true,
        refundedAt: true,
        createdAt: true,
      },
    });

    if (!payment) {
      return res.status(404).send('<h1>Receipt not found</h1><p>The requested transaction does not exist.</p>');
    }

    const amountFormatted = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(payment.amount);

    const requestedAt = payment.requestedAt.toLocaleString('en-GB', { timeZone: 'UTC' });
    const completedAt = payment.completedAt ? payment.completedAt.toLocaleString('en-GB', { timeZone: 'UTC' }) : 'Pending';
    const refundedAt = payment.refundedAt ? payment.refundedAt.toLocaleString('en-GB', { timeZone: 'UTC' }) : 'N/A';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${payment.transactionId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #111827; }
    .receipt { max-width: 760px; margin: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 24px; margin: 0; }
    .tag { padding: 6px 12px; border-radius: 999px; background: #e0f2fe; color: #0369a1; text-transform: uppercase; font-size: 12px; letter-spacing: .05em; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    td { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .label { color: #6b7280; width: 200px; }
    .value { font-weight: 600; }
    .note { margin-top: 24px; color: #475569; font-size: 14px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <h1>Payment Receipt</h1>
        <p>Transaction ID: <strong>${payment.transactionId}</strong></p>
      </div>
      <div class="tag">${payment.status}</div>
    </div>
    <table>
      <tr><td class="label">Phone</td><td class="value">${payment.phone}</td></tr>
      <tr><td class="label">Amount</td><td class="value">${amountFormatted}</td></tr>
      <tr><td class="label">M-Pesa Reference</td><td class="value">${payment.mpesaRef || 'N/A'}</td></tr>
      <tr><td class="label">M-Pesa Receipt</td><td class="value">${payment.mpesaReceipt || 'N/A'}</td></tr>
      <tr><td class="label">MAC Address</td><td class="value">${payment.macAddress}</td></tr>
      <tr><td class="label">IP Address</td><td class="value">${payment.ipAddress || 'N/A'}</td></tr>
      <tr><td class="label">Requested At</td><td class="value">${requestedAt}</td></tr>
      <tr><td class="label">Completed At</td><td class="value">${completedAt}</td></tr>
      <tr><td class="label">Refunded Amount</td><td class="value">${payment.refundedAmount ?? 'N/A'}</td></tr>
      <tr><td class="label">Refund Reason</td><td class="value">${payment.refundReason || 'N/A'}</td></tr>
      <tr><td class="label">Refunded At</td><td class="value">${refundedAt}</td></tr>
      <tr><td class="label">Receipt Generated</td><td class="value">${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })}</td></tr>
    </table>
    <p class="note">This receipt is generated by the administrative dashboard. Please print or save this page for your records.</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="receipt_${payment.transactionId}.html"`);
    return res.send(html);
  } catch (error) {
    console.error('Receipt render error:', error);
    return res.status(500).send('<h1>Unable to display receipt</h1><p>Server error occurred while generating the receipt.</p>');
  }
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
    const adminId = req.admin?.id;
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

// ✅ SYSTEM SETTINGS ENDPOINTS (CRITICAL FIX #1)

// GET system settings
router.get("/system/settings", authMiddleware, async (req, res) => {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 1 }
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 1 }
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

// POST system settings — FIXED: Now actually saves to database
router.post("/system/settings", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const {
      networkName,
      adminEmail,
      maxConcurrentUsers,
      sessionTimeout,
      autoDisconnect,
      currency,
      taxRate,
      paymentGateway,
      mpesaTimeout,
      defaultPackage,
      maintenanceMode
    } = req.body;

    // Validate input
    const errors = [];
    if (maxConcurrentUsers !== undefined && (maxConcurrentUsers < 1 || maxConcurrentUsers > 1000)) {
      errors.push("maxConcurrentUsers must be between 1 and 1000");
    }
    if (sessionTimeout !== undefined && (sessionTimeout < 1 || sessionTimeout > 24)) {
      errors.push("sessionTimeout must be between 1 and 24 hours");
    }
    if (taxRate !== undefined && (taxRate < 0 || taxRate > 100)) {
      errors.push("taxRate must be between 0 and 100");
    }
    if (mpesaTimeout !== undefined && (mpesaTimeout < 10 || mpesaTimeout > 300)) {
      errors.push("mpesaTimeout must be between 10 and 300 seconds");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: "Validation failed", errors });
    }

    const updates = {
      networkName,
      adminEmail,
      maxConcurrentUsers,
      sessionTimeout,
      autoDisconnect,
      currency,
      taxRate,
      paymentGateway,
      mpesaTimeout,
      defaultPackage,
      maintenanceMode
    };

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        ...(networkName && { networkName }),
        ...(adminEmail && { adminEmail }),
        ...(maxConcurrentUsers !== undefined && { maxConcurrentUsers }),
        ...(sessionTimeout !== undefined && { sessionTimeout }),
        ...(autoDisconnect !== undefined && { autoDisconnect }),
        ...(currency && { currency }),
        ...(taxRate !== undefined && { taxRate }),
        ...(paymentGateway && { paymentGateway }),
        ...(mpesaTimeout !== undefined && { mpesaTimeout }),
        ...(defaultPackage && { defaultPackage }),
        ...(maintenanceMode !== undefined && { maintenanceMode }),
        updatedBy: adminId,
        updatedAt: new Date()
      },
      create: {
        id: 1,
        ...(networkName && { networkName }),
        ...(adminEmail && { adminEmail }),
        ...(maxConcurrentUsers !== undefined && { maxConcurrentUsers }),
        ...(sessionTimeout !== undefined && { sessionTimeout }),
        ...(autoDisconnect !== undefined && { autoDisconnect }),
        ...(currency && { currency }),
        ...(taxRate !== undefined && { taxRate }),
        ...(paymentGateway && { paymentGateway }),
        ...(mpesaTimeout !== undefined && { mpesaTimeout }),
        ...(defaultPackage && { defaultPackage }),
        ...(maintenanceMode !== undefined && { maintenanceMode }),
        updatedBy: adminId
      }
    });

    // Log admin action
    logAudit('ADMIN_UPDATE_SETTINGS', {
      adminId,
      changes: Object.keys(updates).filter((key) => updates[key] !== undefined),
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: settings, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ success: false, error: "Failed to update settings" });
  }
});

// ✅ HEALTH CHECK ENDPOINTS (CRITICAL FIX #2)

// GET /api/health/api — Check API response time
router.get("/health/api", async (req, res) => {
  const startTime = Date.now();
  try {
    // Simple DB query to measure response time
    await prisma.admin.findFirst();
    const responseTime = Date.now() - startTime;
    
    const status = responseTime < 100 ? 'good' : responseTime < 500 ? 'warning' : 'bad';
    res.json({ 
      success: true, 
      data: { 
        service: 'api',
        status: status,
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      data: { 
        service: 'api',
        status: 'bad',
        error: error.message
      }
    });
  }
});

// GET /api/health/database — Check database connection
router.get("/health/database", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      success: true, 
      data: { 
        service: 'database',
        status: 'good',
        message: 'Database connected'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      data: { 
        service: 'database',
        status: 'bad',
        error: error.message
      }
    });
  }
});

// GET /api/health/mpesa — Check M-Pesa API connectivity
router.get("/health/mpesa", async (req, res) => {
  try {
    // Try to access M-Pesa configuration
    const mpesaConfig = require("../config/mpesa");
    if (!mpesaConfig) throw new Error("M-Pesa not configured");
    
    // For a full check, you'd make a test API call to M-Pesa
    // For now, we'll just check if configuration exists
    res.json({ 
      success: true, 
      data: { 
        service: 'mpesa',
        status: 'good',
        message: 'M-Pesa configured'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      data: { 
        service: 'mpesa',
        status: 'bad',
        error: error.message
      }
    });
  }
});

// GET /api/health/ssl — Check SSL certificate
router.get("/health/ssl", async (req, res) => {
  try {
    const certificate = req.socket.getPeerCertificate();
    const valid = certificate && !certificate.issuer;
    
    res.json({ 
      success: true, 
      data: { 
        service: 'ssl',
        status: valid ? 'good' : 'warning',
        message: valid ? 'SSL valid' : 'SSL not configured in dev'
      }
    });
  } catch (error) {
    res.json({ 
      success: true, 
      data: { 
        service: 'ssl',
        status: 'warning',
        message: 'SSL check unavailable (development)'
      }
    });
  }
});

module.exports = router;
