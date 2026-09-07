const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { logAudit } = require("../utils/auditLogger");
const prisma = require("../config/prismaClient");
const authMiddleware = require("../middleware/authMiddleware");
const { csrfProtection } = require("../middleware/csrfMiddleware");
const { getRedisClient } = require("../config/redis");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error("Missing JWT_SECRET in environment variables");
}

// AUTH-4 FIX: Single source of truth for token TTL — used for both jwt.sign and cookie maxAge
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Shared cookie options to guarantee login and logout use identical attributes
// AUTH-6 FIX: clearCookie must use the same options as res.cookie or browsers ignore it
function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',  // AUTH-6 FIX: was 'strict' in clearCookie — must match the set cookie
    maxAge: TOKEN_TTL_MS,
  };
}

// ✅ Admin Login Route
// Rate limiting is applied globally via app.use("/auth", authLimiter) in index.js.
router.post("/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
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

        // Find admin by email
        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // AUTH-5 FIX: Embed a unique jti (JWT ID) so this token can be individually
        // revoked on logout by storing the jti in the Redis denylist.
        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: "admin", jti },
            SECRET_KEY,
            { expiresIn: Math.floor(TOKEN_TTL_MS / 1000) } // expiresIn is in seconds
        );

        logAudit("admin_login", { email }, admin.id);

        res.cookie('admin_token', token, adminCookieOptions());
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

// ✅ Check Auth Status Route — verifies if the admin is still logged in
router.get("/admin/me", authMiddleware, async (req, res) => {
    try {
        // req.admin is populated (and DB-verified) by authMiddleware
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

// ✅ AUTH-4 FIX: Token Refresh Route
// Allows a logged-in admin to obtain a fresh 1-hour token without re-entering credentials.
// The existing token must still be valid (authMiddleware enforces this).
router.post("/admin/refresh", authMiddleware, async (req, res) => {
    try {
        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { id: req.admin.id, email: req.admin.email, role: "admin", jti },
            SECRET_KEY,
            { expiresIn: Math.floor(TOKEN_TTL_MS / 1000) }
        );

        logAudit("admin_token_refreshed", { adminId: req.admin.id });
        res.cookie('admin_token', token, adminCookieOptions());
        res.json({ success: true, message: "Token refreshed successfully" });
    } catch (error) {
        console.error("Token Refresh Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Admin Logout Route
// AUTH-5 FIX: On logout, the token's jti is stored in Redis with a TTL equal to
// the token's remaining lifetime. authMiddleware checks this denylist on every request
// so the token becomes immediately invalid even if not yet expired.
router.post("/admin/logout", authMiddleware, csrfProtection, async (req, res) => {
    try {
        if (req.admin?.jti) {
            const redis = getRedisClient();
            if (redis) {
                try {
                    const nowSec = Math.floor(Date.now() / 1000);
                    const remainingTtl = (req.admin.exp || 0) - nowSec;
                    if (remainingTtl > 0) {
                        await redis.set(`denylist:${req.admin.jti}`, '1', 'EX', remainingTtl);
                    }
                } catch (redisErr) {
                    // Log but don't fail the logout — the cookie will still be cleared
                    console.warn("[Auth] Failed to add token to denylist:", redisErr.message);
                }
            }
        }

        // AUTH-6 FIX: clear without maxAge (browsers ignore maxAge on clearCookie)
        //             but same httpOnly/secure/sameSite so the browser matches the cookie
        res.clearCookie('admin_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        logAudit("admin_logout", { adminId: req.admin?.id });
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;

