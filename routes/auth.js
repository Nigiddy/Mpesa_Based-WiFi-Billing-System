const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { logAudit } = require("../utils/auditLogger");
const prisma = require("../config/prismaClient");
const authMiddleware = require("../middleware/authMiddleware");
const { csrfProtection } = require("../middleware/csrfMiddleware");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error("Missing JWT_SECRET in environment variables");
}

// ✅ Admin Login Route
// Rate limiting is applied globally via app.use("/auth", authLimiter) in index.js.
// Do NOT add authLimiter here again — that would double-count every request (C-2 fix).
router.post("/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation: basic format checks
        if (
            !email ||
            !password ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !/^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email) ||
            password.length < 6
        ) {
            return res.status(400).json({ error: "Invalid email or password format" });
        }

        // Find admin by email using Prisma
        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: "admin" },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        // Audit log: admin login
        logAudit("admin_login", { email }, admin.id);
        // Set JWT as HttpOnly cookie
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            // 'lax' allows the cookie on top-level GET navigations (e.g., link from email)
            // while still blocking cross-site POSTs. 'strict' breaks dashboard links
            // from external sources even when the admin has a valid session.
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000 // 1 hour
        });
        // Send admin info in response
        res.json({
            success: true,
            message: "Login successful",
            data: { admin: { id: admin.id, email: admin.email } }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Check Auth Status Route (verify if admin is logged in)
// H-1 FIX: Reuses authMiddleware instead of duplicating JWT verification logic.
router.get("/admin/me", authMiddleware, async (req, res) => {
    try {
        // req.admin is populated by authMiddleware after successful JWT verification
        const admin = await prisma.admin.findUnique({
            where: { id: req.admin.id },
            select: { id: true, email: true }, // Never return the password hash
        });

        if (!admin) {
            return res.status(401).json({ success: false, error: "Admin not found" });
        }

        res.json({ success: true, data: { admin } });
    } catch (error) {
        console.error("Auth Check Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// ✅ Admin Logout Route
// C-3a FIX: Added csrfProtection to prevent CSRF logout attacks.
// The frontend must include the X-CSRF-Token header (already done via apiClient).
router.post("/admin/logout", csrfProtection, (req, res) => {
    try {
        res.clearCookie('admin_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
