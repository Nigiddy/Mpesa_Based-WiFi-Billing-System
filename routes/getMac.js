const express = require("express");
const router = express.Router();
const { exec } = require("child_process");

const getMacAddress = (ip) => {
  return new Promise((resolve, reject) => {
    if (!ip) return resolve(null);

    const platform = process.platform;
    const cmd = platform === "win32" ? `arp -a | find "${ip}"` : `arp -an | grep "(${ip})"`;

    exec(cmd, (error, stdout) => {
      if (error) {
        console.error("Error fetching MAC address:", error);
        return reject("Error fetching MAC address.");
      }

      const macRegex = /([a-fA-F0-9]{2}[:-]){5}[a-fA-F0-9]{2}/;
      const macMatch = stdout.match(macRegex);
      resolve(macMatch ? macMatch[0] : "MAC_NOT_FOUND");
    });
  });
};

router.get("/device/info", async (req, res) => {
  try {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ipFromForwarded = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")[0];
    const ip = req.query.ip || ipFromForwarded || req.ip || req.connection?.remoteAddress;

    if (!ip) {
      return res.status(400).json({ success: false, error: "IP address is required." });
    }

    const macAddress = await getMacAddress(ip);
    return res.json({
      success: true,
      data: {
        macAddress,
        ipAddress: ip,
        deviceId: macAddress !== "MAC_NOT_FOUND" ? macAddress : ip,
      },
    });
  } catch (error) {
    console.error("/device/info error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
