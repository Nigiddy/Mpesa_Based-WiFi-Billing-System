/**
 * Enhanced MikroTik Integration Service
 * Includes:
 * - Improved MAC validation
 * - Transaction tracking
 * - Session management
 * - Secure connection handling
 */

require("dotenv").config();
const { RouterOSClient } = require("node-routeros");
const { logAudit } = require("../utils/auditLogger");
const {
  validateMACFormat,
  detectPotentialSpoofing,
} = require("../services/MACAddressService");

const MIKROTIK_ENABLED = String(process.env.MIKROTIK_ENABLED || "false").toLowerCase() === "true";

/**
 * Create RouterOS client with proper error handling
 */
function getClient() {
  if (!MIKROTIK_ENABLED) {
    console.log("ℹ️ MikroTik disabled - running in dev mode");
    return null;
  }

  const host = process.env.MIKROTIK_HOST;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;
  const port = Number(process.env.MIKROTIK_PORT || 8728);

  if (!host || !user || !password) {
    console.error("❌ Missing MikroTik credentials");
    return null;
  }

  try {
    return new RouterOSClient({
      host,
      user,
      password,
      port,
      timeout: 5000,
      tls: process.env.NODE_ENV === 'production' // Use TLS in production
    });
  } catch (error) {
    console.error("❌ Failed to create RouterOS client:", error.message);
    return null;
  }
}

/**
 * Whitelist MAC address in MikroTik
 * Enhanced with validation and tracking
 */
async function whitelistMAC(macAddress, timeLabel) {
  try {
    // ✅ Step 1: Validate MAC format
    const validation = validateMACFormat(macAddress);
    if (!validation.valid) {
      logAudit("mac_whitelist_failed", {
        macAddress,
        timeLabel,
        reason: "invalid_format",
        error: validation.error
      });
      return { success: false, message: validation.error };
    }

    const normalizedMAC = validation.normalized;

    // ✅ Step 2: Check for spoofing indicators
    const spoofingCheck = await detectPotentialSpoofing(normalizedMAC, null);
    if (spoofingCheck.isSuspicious) {
      console.warn("⚠️ SUSPICIOUS: Possible MAC spoofing detected");
      logAudit("suspicious_mac_whitelist", {
        macAddress: normalizedMAC,
        ...spoofingCheck
      });
      // Log but allow - could be false positive
    }

    const client = getClient();

    if (!client) {
      // Dev mode
      console.log(`📝 [DEV MODE] Would whitelist ${normalizedMAC} for ${timeLabel}`);
      logAudit("mac_whitelist_dev_mode", { macAddress: normalizedMAC, timeLabel });
      return { success: true, message: `Dev mode: whitelisted ${normalizedMAC}` };
    }

    try {
      await client.connect();

      // Add to MikroTik hotspot bypass (common approach)
      const comment = `Qonnect_${timeLabel}_${new Date().toISOString()}`;

      await client.write(["/ip/hotspot/ip-binding/add"], {
        "mac-address": normalizedMAC,
        type: "bypassed",
        comment
      });

      await client.close();

      logAudit("mac_whitelist_success", {
        macAddress: normalizedMAC,
        timeLabel,
        comment
      });

      console.log(`✅ MAC whitelisted: ${normalizedMAC} for ${timeLabel}`);

      return { success: true, message: `Whitelisted ${normalizedMAC}` };
    } catch (error) {
      console.error("❌ MikroTik whitelist error:", error.message);
      logAudit("mac_whitelist_error", {
        macAddress: normalizedMAC,
        timeLabel,
        error: error.message
      });

      return {
        success: false,
        message: "Failed to whitelist MAC in MikroTik"
      };
    }
  } catch (error) {
    console.error("❌ Whitelist MAC error:", error.message);
    logAudit("mac_whitelist_exception", {
      macAddress,
      timeLabel,
      error: error.message
    });

    return { success: false, message: error.message };
  }
}

/**
 * Disconnect user by MAC address
 */
async function disconnectByMac(macAddress) {
  try {
    const validation = validateMACFormat(macAddress);
    if (!validation.valid) {
      return { success: false, message: validation.error };
    }

    const normalizedMAC = validation.normalized;
    const client = getClient();

    if (!client) {
      console.log(`📝 [DEV MODE] Would disconnect ${normalizedMAC}`);
      return { success: true, message: `Dev mode: disconnected ${normalizedMAC}` };
    }

    try {
      await client.connect();

      // Find active connection
      const active = await client.write(["/ip/hotspot/active/print"]);
      const entry = (active || []).find(
        (a) => (a["mac-address"] || "").toUpperCase() === normalizedMAC
      );

      if (entry && entry[".id"]) {
        await client.write(["/ip/hotspot/active/remove"], { ".id": entry[".id"] });

        logAudit("mac_disconnected", {
          macAddress: normalizedMAC,
          hotspotId: entry[".id"]
        });

        console.log(`✅ Disconnected: ${normalizedMAC}`);
      } else {
        console.log(`ℹ️ No active connection found for ${normalizedMAC}`);
      }

      await client.close();

      return { success: true, message: `Disconnected ${normalizedMAC}` };
    } catch (error) {
      console.error("❌ MikroTik disconnect error:", error.message);
      logAudit("mac_disconnect_error", {
        macAddress: normalizedMAC,
        error: error.message
      });

      return { success: false, message: error.message };
    }
  } catch (error) {
    console.error("❌ Disconnect error:", error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Disconnect all active users (admin function)
 */
async function disconnectAllUsers() {
  const client = getClient();

  if (!client) {
    return { success: true, message: "Dev mode: disconnected all users" };
  }

  try {
    await client.connect();

    const active = await client.write(["/ip/hotspot/active/print"]);

    let disconnectCount = 0;
    for (const connection of active || []) {
      if (connection[".id"]) {
        await client.write(["/ip/hotspot/active/remove"], { ".id": connection[".id"] });
        disconnectCount++;
      }
    }

    await client.close();

    logAudit("disconnect_all_users", {
      disconnectCount
    });

    console.log(`✅ Disconnected ${disconnectCount} users`);

    return {
      success: true,
      message: `Disconnected ${disconnectCount} users`
    };
  } catch (error) {
    console.error("❌ MikroTik disconnect all error:", error.message);
    logAudit("disconnect_all_error", {
      error: error.message
    });

    return { success: false, message: error.message };
  }
}

/**
 * Get list of currently active devices
 */
async function getActiveDevices() {
  const client = getClient();

  if (!client) {
    return { success: true, data: [] };
  }

  try {
    await client.connect();

    const active = await client.write(["/ip/hotspot/active/print"]);

    await client.close();

    const devices = (active || []).map((a) => ({
      macAddress: a["mac-address"],
      ipAddress: a.address,
      user: a.user,
      uptime: a.uptime
    }));

    return { success: true, data: devices };
  } catch (error) {
    console.error("❌ MikroTik get active devices error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get MikroTik server status
 */
async function getStatus() {
  const client = getClient();

  if (!client) {
    return {
      success: true,
      data: { status: "ok", uptime: 0, connectedUsers: 0, mode: "dev" }
    };
  }

  try {
    await client.connect();

    const active = await client.write(["/ip/hotspot/active/print"]);

    // Get RouterOS version
    const systemIdentity = await client.write(["/system/identity/print"]);
    const identity = systemIdentity?.[0]?.name || "Unknown";

    await client.close();

    return {
      success: true,
      data: {
        status: "ok",
        uptime: 0,
        connectedUsers: (active || []).length,
        identity
      }
    };
  } catch (error) {
    console.error("❌ MikroTik get status error:", error.message);
    return {
      success: false,
      error: error.message,
      data: { status: "error" }
    };
  }
}

module.exports = {
  RouterOSClient,
  whitelistMAC,
  disconnectByMac,
  disconnectAllUsers,
  getActiveDevices,
  getStatus,
  MIKROTIK_ENABLED
};
