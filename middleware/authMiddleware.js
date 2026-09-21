const jwt = require("jsonwebtoken");
const { getRedisClient } = require("../config/redis");
const prisma = require("../config/prismaClient");
require("dotenv").config();

const extractToken = (req) => {
  const authHeader = req.header("Authorization");
  if (authHeader) {
    return authHeader.replace(/^Bearer\s+/i, "");
  }
  return req.cookies?.admin_token || null;
};

/**
 * Authentication middleware for admin routes.
 *
 * Fixes applied:
 *  AUTH-1  — Pins algorithm to HS256 to prevent alg:none attacks.
 *  AUTH-5  — Checks Redis denylist for revoked tokens (logout revocation).
 *            Fails open if Redis is unavailable (logs a warning) so a Redis
 *            outage does not permanently lock admins out of the system.
 *  AUTH-7  — Verifies the admin account still exists in the database, so a
 *            demoted or deleted admin is rejected even with a valid token.
 *  AUTH-R3 — Fetches admin.role from DB on every request and exposes it as
 *            req.admin.dbRole so requireSuperAdmin always uses live data,
 *            not a potentially stale JWT claim.
 */
const authMiddleware = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // AUTH-1 FIX: Pin algorithm to HS256 — prevents alg:none / algorithm confusion attacks
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    // AUTH-5 FIX: Check the Redis denylist for revoked tokens
    if (decoded.jti) {
      const redis = getRedisClient();
      if (redis) {
        try {
          const isDenied = await redis.get(`denylist:${decoded.jti}`);
          if (isDenied) {
            return res.status(401).json({ error: "Token has been revoked. Please log in again." });
          }
        } catch (redisErr) {
          // Fail open: if Redis is down we cannot check the denylist,
          // but we log a warning so the operator is aware.
          console.warn("[Auth] Redis denylist check failed — proceeding without revocation check:", redisErr.message);
        }
      }
    }

    // AUTH-7 FIX: Verify admin account still exists in the database.
    // This catches deleted/demoted admins whose tokens have not yet expired.
    //
    // AUTH-R3 FIX: Select `role` so we can enforce RBAC at the endpoint level.
    // req.admin.dbRole is always the live DB value — immune to stale JWT claims.
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!admin) {
      return res.status(401).json({ error: "Admin account not found or has been removed." });
    }

    // Attach decoded token payload + fresh DB data to the request.
    // dbRole is the DB enum value (SUPER_ADMIN | VIEWER) — used by requireSuperAdmin.
    req.admin = { ...decoded, ...admin, dbRole: admin.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired." });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token." });
    }

    console.error("JWT verification error:", err);
    return res.status(401).json({ error: "Invalid token." });
  }
};

/**
 * Authorization guard for SUPER_ADMIN-only endpoints.
 *
 * AUTH-R3 FIX: Must be placed AFTER authMiddleware in the middleware chain.
 * Rejects VIEWER admins with 403 Forbidden so they cannot perform destructive
 * operations (block/delete users, system settings, disconnect-all, etc.).
 *
 * Usage:
 *   router.post("/users/:id/block", authMiddleware, requireSuperAdmin, csrfProtection, handler);
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.dbRole !== "SUPER_ADMIN") {
    return res.status(403).json({
      error: "Super admin access required.",
      message: "This action is restricted to SUPER_ADMIN accounts.",
    });
  }
  next();
};

// ── Dual export ────────────────────────────────────────────────────────────────
// Backward-compat: `const authMiddleware = require('../middleware/authMiddleware')`
// Named import:   `const { authMiddleware, requireSuperAdmin } = require(...)`
authMiddleware.requireSuperAdmin = requireSuperAdmin;
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireSuperAdmin = requireSuperAdmin;

