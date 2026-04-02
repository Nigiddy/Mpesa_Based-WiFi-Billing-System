const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const enforceHTTPS = require("./middleware/enforceHTTPS");
require("dotenv").config();

// ✅ Custom imports for health checks and secrets
const prisma = require('./config/prismaClient');
const Redis = require('ioredis');
const { validateSecrets, displaySecretsConfig } = require("./config/secrets");
const { initWebSocket } = require("./services/websocket");

// ✅ Validate secrets on startup
validateSecrets();
displaySecretsConfig();

// ✅ Use versioned, secure routes
const mpesaRoutesV1 = require("./routes/mpesaRoutes");
const mpesaCallbackV2 = require("./routes/mpesaCallback");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const sessionRoutes = require("./routes/session");
const voucherRoutes = require("./routes/vouchers");
const { authLimiter, apiLimiter } = require("./middleware/rateLimit");

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
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })
);

// ✅ Middleware
app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Handle OPTIONS preflight requests
app.options("*", cors());

// Apply rate limiting to specific routes
app.use("/auth", authLimiter);
app.use("/api", apiLimiter); // General API limiter

// Admin Routes
app.use("/api", adminRoutes);
app.use("/api", sessionRoutes);

// ✅ Register Routes (v1 and v2 versioned)
app.use("/api/v1", mpesaRoutesV1); // Secure payment endpoints (rate limited internally)
app.use("/", mpesaCallbackV2);     // Secure callback handler
app.use("/auth", authRoutes);
app.use("/api/vouchers", voucherRoutes); // Voucher feature (routes/vouchers/)

// ✅ Comprehensive Health Check Route
app.get("/", async (req, res) => {
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true });
    await Promise.all([
      prisma.$queryRaw`SELECT 1`, // Check DB connection
      redis.ping(), // Check Redis connection
    ]);
    redis.quit();
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dependencies: { database: 'ok', redis: 'ok' }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'One or more critical dependencies are down.',
      details: process.env.NODE_ENV === 'production' ? 'See logs for details' : error.message
    });
  }
});


// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ CORS allowed origin: ${FRONTEND_ORIGIN}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Background workers (BullMQ) started automatically via modules.');
  
  // Initialize WebSocket Server
  initWebSocket(server);
});

// ✅ Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📛 ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server shutdown complete');
    prisma.$disconnect().then(() => {
      console.log('✅ Database connection closed.');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
