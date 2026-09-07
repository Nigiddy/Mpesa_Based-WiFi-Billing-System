const express = require("express");
const router = express.Router();
const prisma = require("../config/prismaClient");
// AUTH-8 FIX: Add rate limiting so any device can't enumerate session state
// for arbitrary MACs at unlimited speed.
const { apiLimiter } = require("../middleware/rateLimit");

// MAC validation regex (normalised uppercase colon-separated)
const MAC_REGEX = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

/**
 * GET /api/session/status?mac=<MAC>
 *
 * Public endpoint used by the captive portal page to check whether a device
 * already has an active paid session before showing the payment form.
 *
 * Security:
 *  - Rate limited (AUTH-8 FIX): prevents MAC enumeration
 *  - Input validated: rejects non-MAC strings before hitting the database
 */
router.get("/session/status", apiLimiter, async (req, res) => {
  try {
    const { mac } = req.query;

    if (!mac) {
      return res.status(400).json({ success: false, error: "MAC address is required" });
    }

    // AUTH-8 FIX: Normalise and validate MAC format before querying the database
    const normalised = String(mac).trim().toUpperCase().replace(/-/g, ":");
    if (!MAC_REGEX.test(normalised)) {
      return res.status(400).json({ success: false, error: "Invalid MAC address format" });
    }

    const session = await prisma.session.findFirst({
      where: {
        macAddress: normalised,
        disconnectedAt: null,
        expiryTime: { gt: new Date() },
      },
      select: { expiryTime: true }, // Return only what the portal needs
    });

    if (session) {
      return res.json({
        success: true,
        data: { hasActiveSession: true, expiresAt: session.expiryTime },
      });
    } else {
      return res.json({
        success: true,
        data: { hasActiveSession: false },
      });
    }
  } catch (error) {
    console.error("Error checking session status:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;

