const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const enforceHTTPS = require("./middleware/enforceHTTPS");
require("dotenv").config();

// ✅ Validate secrets on startup
// ✅ Validate secrets on startup
const { validateSecrets, displaySecretsConfig } = require("./config/secrets");
const { initWebSocket } = require("./services/websocket"); // Import WebSocket service
validateSecrets();
displaySecretsConfig();


// ✅ Use versioned, secure routes
const mpesaRoutesV1 = require("./routes/mpesaRoutes.v1");
const mpesaCallbackV2 = require("./routes/mpesaCallback.v2");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const { authLimiter, paymentLimiter, apiLimiter } = require("./middleware/rateLimit");

// ✅ Background workers
const { startSessionExpiryWorker, stopSessionExpiryWorker } = require("./workers/sessionExpiryWorker");
const { startPaymentTimeoutWorker, stopPaymentTimeoutWorker } = require("./workers/paymentTimeoutWorker");

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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Middleware
app.use(cookieParser()); // ⚠️ MUST be before CSRF middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Handle OPTIONS preflight requests
app.options("*", cors());

// Apply rate limiting to specific routes
app.use("/auth", authLimiter);
app.use("/api/payments", paymentLimiter);
app.use("/api", apiLimiter);

// Admin Routes
app.use("/api", adminRoutes);

// ✅ Register Routes (v1 and v2 versioned)
app.use("/api/v1", mpesaRoutesV1); // Secure payment endpoints with validation
app.use("/", mpesaCallbackV2); // Secure callback handler with 9-step verification
app.use("/auth", authRoutes);

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.send("Kibaruani Billing System Backend is Running!");
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
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
let sessionExpiryInterval = null;
let paymentTimeoutInterval = null;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ CORS allowed origin: ${FRONTEND_ORIGIN}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);

  // ✅ Start background workers
  console.log('\n🔄 Starting background workers...');
  sessionExpiryInterval = startSessionExpiryWorker();
  paymentTimeoutInterval = startPaymentTimeoutWorker();

  // Try to initialize payment worker if it exists (it might be in a separate file or required here)
  try {
    const { initializePaymentWorker } = require('./workers/paymentWorker');
    initializePaymentWorker();
  } catch (e) {
    console.warn("Could not auto-start payment worker:", e.message);
  }

  console.log('✅ All background workers started\n');

  // ✅ Initialize WebSocket Server
  initWebSocket(server);
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📛 SIGTERM received. Shutting down gracefully...');

  // Stop workers
  stopSessionExpiryWorker(sessionExpiryInterval);
  stopPaymentTimeoutWorker(paymentTimeoutInterval);

  // Close server
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('\n📛 SIGINT received. Shutting down gracefully...');

  // Stop workers
  stopSessionExpiryWorker(sessionExpiryInterval);
  stopPaymentTimeoutWorker(paymentTimeoutInterval);

  // Close server
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});
