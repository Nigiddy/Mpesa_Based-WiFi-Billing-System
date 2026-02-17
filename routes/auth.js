const express = require("express");
const { authLimiter } = require("../middleware/rateLimit");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { logAudit } = require("../utils/auditLogger");
const prisma = require("../config/prismaClient");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error("Missing JWT_SECRET in environment variables");
}

// ✅ Admin Login Route with rate limiting
router.post("/admin/login", authLimiter, async (req, res) => {
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
        const token = jwt.sign({ id: admin.id, email: admin.email }, SECRET_KEY, { expiresIn: "1h" });

        // Audit log: admin login
        logAudit("admin_login", { email }, admin.id);
        // Set JWT as HttpOnly cookie
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        });
        // Send admin info in response
        res.json({ success: true, message: "Login successful", admin: { id: admin.id, email: admin.email } });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Check Auth Status Route (verify if admin is logged in)
router.get("/admin/me", async (req, res) => {
    try {
        const token = req.cookies.admin_token;
        
        if (!token) {
            return res.status(401).json({ success: false, error: "Not authenticated" });
        }

        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            const admin = await prisma.admin.findUnique({ 
                where: { id: decoded.id },
                select: { id: true, email: true } // Don't return password
            });

            if (!admin) {
                return res.status(401).json({ success: false, error: "Admin not found" });
            }

            res.json({ success: true, admin });
        } catch (tokenError) {
            return res.status(401).json({ success: false, error: "Invalid or expired token" });
        }
    } catch (error) {
        console.error("Auth Check Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// ✅ Admin Logout Route
router.post("/admin/logout", (req, res) => {
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
