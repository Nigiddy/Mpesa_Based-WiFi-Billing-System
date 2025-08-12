const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const mpesaRoutes = require("./routes/mpesaRoutes");
const mpesaCallback = require("./routes/mpesaCallback");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const getMacRoute = require("./routes/getMac");

const app = express();

// Trust proxy for correct req.ip behind reverse proxies
app.set("trust proxy", true);

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
app.use(bodyParser.json());

// ✅ Handle OPTIONS preflight requests
app.options("*", cors());

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

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
});
