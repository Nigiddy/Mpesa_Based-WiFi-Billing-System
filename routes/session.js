const express = require("express");
const router = express.Router();
const prisma = require("../config/prismaClient");

router.get("/session/status", async (req, res) => {
  try {
    const { mac } = req.query;

    if (!mac) {
      return res.status(400).json({ success: false, error: "MAC address is required" });
    }

    const session = await prisma.session.findFirst({
      where: {
        macAddress: mac,
        disconnectedAt: null,
        expiryTime: {
          gt: new Date(),
        },
      },
    });

    if (session) {
      return res.json({
        success: true,
        data: {
          hasActiveSession: true,
          expiresAt: session.expiryTime,
        },
      });
    } else {
      return res.json({
        success: true,
        data: {
          hasActiveSession: false,
        },
      });
    }
  } catch (error) {
    console.error("Error checking session status:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
