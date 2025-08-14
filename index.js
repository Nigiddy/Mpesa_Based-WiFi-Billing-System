const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
require("dotenv").config();

const mpesaRoutes = require("./routes/mpesaRoutes");
const mpesaCallback = require("./routes/mpesaCallback");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const getMacRoute = require("./routes/getMac");
const { authLimiter, paymentLimiter, apiLimiter } = require("./middleware/rateLimit");

const app = express();

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

// get MAC
app.use("/api", getMacRoute);

// ✅ Register Routes
app.use("/api", mpesaRoutes);
app.use("/", mpesaCallback);
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
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ CORS allowed origin: ${FRONTEND_ORIGIN}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});
