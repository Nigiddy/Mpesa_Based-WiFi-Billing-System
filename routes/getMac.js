const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");

// Input validation and sanitization
const validateIP = (ip) => {
  if (!ip || typeof ip !== 'string') return false;

  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 validation (basic)
  const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::1$|^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^[a-fA-F0-9]{1,4}::$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1';
};

const sanitizeIP = (ip) => {
  // Allow numbers, dots, and colons (for IPv6)
  return ip.replace(/[^0-9.:a-fA-F]/g, '');
};

const getMacAddress = (ip) => {
  return new Promise((resolve, reject) => {
    if (!ip || !validateIP(ip)) {
      return resolve(null);
    }

    // Check for localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip.includes('::ffff:127.0.0.1')) {
      return resolve("00:00:00:00:00:00");
    }

    const sanitizedIP = sanitizeIP(ip);
    const platform = process.platform;

    // ✅ SAFE: Use spawn instead of exec to prevent command injection
    const { spawn } = require("child_process");

    let arpProcess;
    let grepProcess;

    try {
      const timeout = setTimeout(() => {
        if (arpProcess) arpProcess.kill();
        if (grepProcess) grepProcess.kill();
        resolve("MAC_NOT_FOUND");
      }, 5000);

      // Spawn ARP process
      if (platform === "win32") {
        // Windows: arp -a
        arpProcess = spawn("arp", ["-a"]);
      } else {
        // Linux/Mac: arp -an
        arpProcess = spawn("arp", ["-an"]);
      }

      // Spawn grep process
      grepProcess = spawn("grep", [sanitizedIP]);

      // Pipe arp output to grep
      arpProcess.stdout.pipe(grepProcess.stdin);

      let output = "";

      grepProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      grepProcess.on("close", (code) => {
        clearTimeout(timeout);

        if (!output) {
          return resolve("MAC_NOT_FOUND");
        }

        // Extract MAC address from output
        const macRegex = /([a-fA-F0-9]{2}[:-]){5}[a-fA-F0-9]{2}/;
        const macMatch = output.match(macRegex);

        resolve(macMatch ? macMatch[0] : "MAC_NOT_FOUND");
      });

      grepProcess.on("error", (error) => {
        clearTimeout(timeout);
        console.error("Error fetching MAC address:", error.message);
        resolve("MAC_NOT_FOUND");
      });

      arpProcess.on("error", (error) => {
        clearTimeout(timeout);
        console.error("Error running arp command:", error.message);
        resolve("MAC_NOT_FOUND");
      });
    } catch (error) {
      console.error("Exception in getMacAddress:", error.message);
      resolve("MAC_NOT_FOUND");
    }
  });
};

router.get("/device/info", async (req, res) => {
  try {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ipFromForwarded = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")[0];

    // Normalize IP
    let ip = req.query.ip || ipFromForwarded || req.ip || req.connection?.remoteAddress;

    // Handle IPv6 mapped IPv4
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    if (!ip || !validateIP(ip)) {
      console.warn(`[Device Info] Invalid IP ignored: ${ip}`);
      return res.status(400).json({
        success: false,
        error: `Valid IP address is required. Received: ${ip}`
      });
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
