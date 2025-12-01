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
        // Send token in response
        res.json({ success: true, message: "Login successful", token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
