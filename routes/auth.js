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

// AUTH-W2: Lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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

/**
 * Helper: revoke a JWT by adding its jti to the Redis denylist.
 * TTL is set to the token's remaining lifetime so Redis auto-expires the entry.
 * Fails silently (logs warning) so Redis downtime doesn't break auth flows.
 *
 * @param {string} jti  - JWT ID claim
 * @param {number} exp  - JWT exp claim (Unix seconds)
 */
async function revokeToken(jti, exp) {
  if (!jti) return;
  const redis = getRedisClient();
  if (!redis) return;
  try {
    const remainingTtl = (exp || 0) - Math.floor(Date.now() / 1000);
    if (remainingTtl > 0) {
      await redis.set(`denylist:${jti}`, '1', 'EX', remainingTtl);
    }
  } catch (err) {
    console.warn("[Auth] Failed to add token to denylist:", err.message);
  }
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

        // AUTH-R3 FIX: Select role so we can embed dbRole in the JWT.
        // AUTH-W2 FIX: Also select failedAttempts and lockedUntil for lockout checks.
        const admin = await prisma.admin.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
                failedAttempts: true,
                lockedUntil: true,
            },
        });

        if (!admin) {
            // Return generic message — don't reveal whether the email exists
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // AUTH-W2 FIX: Reject if account is temporarily locked.
        // Use a constant-time-safe message that does not confirm the email exists.
        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
            const retryAfterSec = Math.ceil((admin.lockedUntil - Date.now()) / 1000);
            logAudit("admin_login_locked", { email, retryAfterSec });
            return res.status(429).json({
                error: "Account temporarily locked due to too many failed attempts.",
                retryAfter: retryAfterSec,
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            // AUTH-W2 FIX: Increment failure counter; lock after MAX_FAILED_ATTEMPTS.
            const newAttempts = (admin.failedAttempts || 0) + 1;
            const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
            await prisma.admin.update({
                where: { id: admin.id },
                data: {
                    failedAttempts: newAttempts,
                    lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
                    updatedAt: new Date(),
                },
            });
            if (shouldLock) {
                logAudit("admin_login_account_locked", { email, attempts: newAttempts });
            }
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // AUTH-W2 FIX: Reset failure counter on successful authentication.
        await prisma.admin.update({
            where: { id: admin.id },
            data: { failedAttempts: 0, lockedUntil: null, updatedAt: new Date() },
        });

        // AUTH-5 FIX: Embed a unique jti (JWT ID) so this token can be individually
        // revoked on logout by storing the jti in the Redis denylist.
        //
        // AUTH-R3 FIX: Embed dbRole so the frontend can show role-appropriate UI,
        // and so the refresh endpoint can carry the role forward without re-querying.
        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: "admin", dbRole: admin.role, jti },
            SECRET_KEY,
            { expiresIn: Math.floor(TOKEN_TTL_MS / 1000) } // expiresIn is in seconds
        );

        logAudit("admin_login", { email }, admin.id);

        res.cookie('admin_token', token, adminCookieOptions());
        res.json({
            success: true,
            message: "Login successful",
            data: { admin: { id: admin.id, email: admin.email, role: admin.role } }
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
            select: { id: true, email: true, role: true }, // Never return the password hash
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
//
// AUTH-R1 FIX: Before issuing the new token, the OLD token's jti is added to the
// Redis denylist so that both tokens are never simultaneously valid. Without this,
// an attacker who steals a token before refresh gains an extra hour of access.
router.post("/admin/refresh", authMiddleware, async (req, res) => {
    try {
        // AUTH-R1 FIX: Revoke the current token before issuing a replacement.
        await revokeToken(req.admin.jti, req.admin.exp);

        // AUTH-R3 FIX: Carry dbRole forward from the live DB value on req.admin.
        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { id: req.admin.id, email: req.admin.email, role: "admin", dbRole: req.admin.dbRole, jti },
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
        // Revoke the current token via the shared helper
        await revokeToken(req.admin?.jti, req.admin?.exp);

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


