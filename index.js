// ─────────────────────────────────────────────────────────────────────────────
// BOOT-1 FIX: Load dotenv and register process event handlers BEFORE requiring
// any route modules. Errors thrown at module-load time (e.g., missing JWT_SECRET
// in routes/auth.js) would not be caught by handlers registered later in the file.
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();

// server is set after app.listen(); referenced by gracefulShutdown via closure
let server = null;

/**
 * BOOT-8 FIX: Graceful shutdown closes BullMQ workers and Redis before Prisma.
 * Previously only the HTTP server and Prisma were closed, leaving Redis connections
 * abandoned and in-flight BullMQ jobs interrupted mid-transaction.
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n📛 ${signal} received. Shutting down gracefully...`);

  // 1. Stop accepting new HTTP connections
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log("✅ HTTP server closed");
  }

  // 2. Drain BullMQ workers so in-flight jobs complete
  try {
    const { closeWorkers } = require("./workers/timeoutWorkers");
    await closeWorkers();
  } catch (e) {
    console.error("⚠️  Error closing BullMQ workers:", e.message);
  }

  // 3. Close the shared Redis connections after workers are done
  try {
    const { closeRedisClient, closeRateLimitRedisClient } = require("./config/redis");
    await closeRedisClient();
    await closeRateLimitRedisClient();
  } catch (e) {
    console.error("⚠️  Error closing Redis:", e.message);
  }

  // 4. Disconnect Prisma
  try {
    const prisma = require("./config/prismaClient");
    await prisma.$disconnect();
    console.log("✅ Database connection closed");
  } catch (e) {
    console.error("⚠️  Error disconnecting Prisma:", e.message);
  }

  process.exit(0);
};

// Register signal handlers — these now fire even if a route require() throws
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("🔴 Unhandled Promise Rejection:", reason);
  try {
    const { logAudit } = require("./utils/auditLogger");
    logAudit("UNHANDLED_REJECTION", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  } catch { /* logger not available yet */ }
  gracefulShutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (err) => {
  console.error("🔴 Uncaught Exception:", err);
  try {
    const { logAudit } = require("./utils/auditLogger");
    logAudit("UNCAUGHT_EXCEPTION", { error: err.message, stack: err.stack });
  } catch { /* logger not available yet */ }
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// ─────────────────────────────────────────────────────────────────────────────
// Application setup — all requires are now protected by the handlers above
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const enforceHTTPS = require("./middleware/enforceHTTPS");

const prisma = require("./config/prismaClient");
const { getRedisClient } = require("./config/redis");
const { validateSecrets, displaySecretsConfig } = require("./config/secrets");
const { initWebSocket } = require("./services/websocket");
const { getStatus: getMikrotikStatus, ensureHotspotProfiles } = require("./config/mikrotik");

// ✅ Validate secrets on startup — now throws instead of process.exit(1) (BOOT-7)
validateSecrets();
displaySecretsConfig();

// ✅ Route imports — protected by uncaughtException handler registered above
const mpesaRoutesV1 = require("./routes/mpesaRoutes");
const mpesaCallbackV2 = require("./routes/mpesaCallback");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const sessionRoutes = require("./routes/session");
const voucherRoutes = require("./routes/vouchers");
const { authLimiter, apiLimiter } = require("./middleware/rateLimit");
// BOOT-9 FIX: Import csrfErrorHandler early so it can be placed before the 404 handler
const { csrfErrorHandler } = require("./middleware/csrfMiddleware");

const app = express();

// Enforce HTTPS in production
app.use(enforceHTTPS);

// Trust proxy for correct req.ip behind reverse proxies
app.set("trust proxy", 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ✅ Configure CORS from env (dev + prod)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
const corsOptions = {
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
};
app.use(cors(corsOptions));

// ✅ Serve captive portal static files
app.use("/hotspot", express.static(path.join(__dirname, "hotspot")));

// /portal → redirect alias so MikroTik's login-url config stays simple
app.get("/portal", (req, res) => {
  res.sendFile(path.join(__dirname, "hotspot", "login.html"));
});

// ✅ Middleware
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Handle OPTIONS preflight requests
app.options("*", cors(corsOptions));

// Apply rate limiting
app.use("/auth", authLimiter);
app.use("/api", apiLimiter);

// Admin & session routes
app.use("/api", adminRoutes);
app.use("/api", sessionRoutes);

// ✅ Register Routes (v1 and v2 versioned)
app.use("/api/v1", mpesaRoutesV1);
app.use("/", mpesaCallbackV2);
app.use("/auth", authRoutes);
app.use("/api/vouchers", voucherRoutes);

// ✅ RFC 8910 Captive Portal API
app.get("/api/v1/captive-portal", async (req, res) => {
  try {
    const mac = (req.query.mac || req.ip || "").toUpperCase();
    let isAuthenticated = false;

    if (mac) {
      const { checkMACAlreadyActive } = require("./services/MACAddressService");
      const check = await checkMACAlreadyActive(mac);
      isAuthenticated = check.hasActiveSession === true;
    }

    const portalOrigin = process.env.PORTAL_URL || `${req.protocol}://${req.headers.host}`;

    res.set("Cache-Control", "no-store");
    res.json({
      captive:           !isAuthenticated,
      "user-portal-url": `${portalOrigin}/portal?mac=${encodeURIComponent(mac)}`,
      "venue-info-url":  `${portalOrigin}/about`,
      ...(isAuthenticated ? { "seconds-remaining": null } : {}),
    });
  } catch (err) {
    console.error("Captive portal API error:", err);
    res.status(500).json({ captive: true });
  }
});

// ✅ BOOT-4 FIX: Health Check — reuse the shared Redis client singleton instead
// of creating a new ioredis instance (and TCP connection) on every request.
// A monitoring probe hitting this every 10 seconds was opening/closing 6+ Redis
// connections per minute under the old implementation.
app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", async (req, res) => {
  try {
    const redis = getRedisClient();
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      redis ? redis.ping() : Promise.resolve("skip"),
    ]);
    res.status(200).json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      dependencies: { database: "ok", redis: redis ? "ok" : "unavailable" }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      error: "One or more critical dependencies are down.",
      details: process.env.NODE_ENV === "production" ? "See logs for details" : error.message
    });
  }
});

// BOOT-9 FIX: CSRF error handler BEFORE 404 handler.
// Express routes errors (err, req, res, next) middleware differently from normal
// middleware. CSRF errors thrown via next(err) from route handlers will skip the
// 404 handler (which has no err param), but placing this first makes the intent
// clear and prevents future ordering bugs.
app.use(csrfErrorHandler);

// ✅ 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ✅ Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;

server = app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ CORS allowed origin: ${FRONTEND_ORIGIN}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);

  // Initialize WebSocket Server
  initWebSocket(server);

  // Initialise the shared Redis connection eagerly so the first payment callback
  // doesn't pay the connection setup cost
  getRedisClient();

  // ── MikroTik startup checks ──────────────────────────────────────────────
  const mikrotikStatus = await getMikrotikStatus();
  if (mikrotikStatus.success) {
    const d = mikrotikStatus.data;
    console.log(`✅ MikroTik: ${d.status} [${d.mode || "live"}] — ${d.connectedUsers} active user(s)${d.identity ? ` on '${d.identity}'` : ""}`);
  } else {
    console.warn(`⚠️  MikroTik connection FAILED at startup: ${mikrotikStatus.error}`);
    console.warn("   Payments will still process but network access will not be granted until MikroTik is reachable.");
  }

  // Ensure hotspot user-profile with idle-timeout exists on the router
  const profileResult = await ensureHotspotProfiles();
  if (!profileResult.success && profileResult.mode !== "dev") {
    console.warn(`⚠️  MikroTik profile setup failed: ${profileResult.error}`);
  }
});

// BOOT-14 FIX: Force exit after 12 seconds — slightly longer than PM2's kill_timeout
// (set to 12000 in ecosystem.config.js) to ensure Node's own handler fires first.
setTimeout(() => {
  // This only fires if gracefulShutdown was called and somehow stalled
  console.error("❌ Forced exit after shutdown timeout");
  process.exit(1);
}, 12000).unref(); // .unref() prevents this timer from keeping the process alive normally

