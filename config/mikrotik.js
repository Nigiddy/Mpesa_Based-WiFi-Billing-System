/**
 * MikroTik Integration Service (v3 — consolidated)
 *
 * Architecture: Uses /ip/hotspot/user (not ip-binding/bypassed) so that:
 *  - MikroTik profile idle-timeout natively kicks idle devices
 *  - Data cap enforcement via limit-bytes-total on the hotspot user
 *  - Active users visible in /ip/hotspot/active for monitoring & sync
 *
 * MikroTik prerequisite:
 *  - Hotspot must be configured to allow MAC-address login (no password popup)
 *  - ensureHotspotProfiles() is called on app startup to create the required profile
 */

require("dotenv").config();
const { RouterOSClient } = require("node-routeros");
const { logAudit } = require("../utils/auditLogger");

const MIKROTIK_ENABLED =
  String(process.env.MIKROTIK_ENABLED || "false").toLowerCase() === "true";

const IDLE_TIMEOUT_SEC = parseInt(
  process.env.MIKROTIK_IDLE_TIMEOUT_SEC || "600", // 10 minutes default
  10
);

const HOTSPOT_PROFILE = process.env.MIKROTIK_HOTSPOT_PROFILE || "qonnect-default";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate & normalise a MAC address string. */
function validateMACFormat(mac) {
  if (!mac || typeof mac !== "string") {
    return { valid: false, error: "MAC must be a non-empty string" };
  }
  const normalized = mac.trim().toUpperCase().replace(/-/g, ":");
  if (!/^([0-9A-F]{2}:){5}([0-9A-F]{2})$/.test(normalized)) {
    return { valid: false, error: "Invalid MAC format (expected AA:BB:CC:DD:EE:FF)" };
  }
  // Reject multicast addresses (odd first octet)
  if ((parseInt(normalized.slice(0, 2), 16) & 0x01) === 1) {
    return { valid: false, error: "Multicast MAC addresses are not allowed" };
  }
  return { valid: true, normalized };
}

/** Convert seconds → HH:MM:SS string for MikroTik. */
function fmtSeconds(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Create a RouterOS client, or null if MikroTik is disabled / misconfigured. */
function getClient() {
  if (!MIKROTIK_ENABLED) return null;

  const host = process.env.MIKROTIK_HOST;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;
  const port = Number(process.env.MIKROTIK_PORT || 8728);

  if (!host || !user || !password) {
    console.error("❌ MikroTik: missing MIKROTIK_HOST / MIKROTIK_USER / MIKROTIK_PASSWORD");
    return null;
  }

  try {
    return new RouterOSClient({
      host,
      user,
      password,
      port,
      timeout: 10000,
      tls: process.env.NODE_ENV === "production",
    });
  } catch (err) {
    console.error("❌ Failed to create RouterOS client:", err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Startup profile setup
// ---------------------------------------------------------------------------

/**
 * Create / update the Qonnect hotspot user-profile on MikroTik.
 * Must be called once at application startup.
 * Sets idle-timeout on the profile so MikroTik natively disconnects idle users.
 */
async function ensureHotspotProfiles() {
  const client = getClient();
  if (!client) {
    console.log("ℹ️  MikroTik disabled — skipping profile setup.");
    return { success: true, mode: "dev" };
  }

  try {
    await client.connect();

    const profiles = await client.write(["/ip/hotspot/user-profile/print"]);
    const existing = (profiles || []).find((p) => p.name === HOTSPOT_PROFILE);
    const idleFmt = fmtSeconds(IDLE_TIMEOUT_SEC);

    const profileParams = {
      name: HOTSPOT_PROFILE,
      "idle-timeout": idleFmt,
      "session-timeout": "0",      // app handles hard expiry via BullMQ
      "keepalive-timeout": "00:02:00",
    };

    if (existing) {
      await client.write(["/ip/hotspot/user-profile/set"], {
        ".id": existing[".id"],
        "idle-timeout": idleFmt,
        "session-timeout": "0",
        "keepalive-timeout": "00:02:00",
      });
      console.log(`✅ MikroTik profile '${HOTSPOT_PROFILE}' updated (idle-timeout=${idleFmt})`);
    } else {
      await client.write(["/ip/hotspot/user-profile/add"], profileParams);
      console.log(`✅ MikroTik profile '${HOTSPOT_PROFILE}' created (idle-timeout=${idleFmt})`);
    }

    await client.close();
    return { success: true };
  } catch (err) {
    console.error("❌ MikroTik profile setup failed:", err.message);
    logAudit("mikrotik_profile_setup_error", { error: err.message });
    try { await client.close(); } catch (_) {}
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Grant network access by creating a MikroTik Hotspot User.
 *
 * @param {string} macAddress  - Device MAC address
 * @param {string} timeLabel   - Human label e.g. "1Hr"
 * @param {Object} [pkg]       - Package from lib/packages.js (for data cap)
 */
async function whitelistMAC(macAddress, timeLabel, pkg = null) {
  const validation = validateMACFormat(macAddress);
  if (!validation.valid) {
    logAudit("mac_whitelist_failed", { macAddress, timeLabel, error: validation.error });
    return { success: false, message: validation.error };
  }

  const mac = validation.normalized;
  const client = getClient();

  if (!client) {
    console.log(`📝 [DEV] Would whitelist ${mac} for ${timeLabel}`);
    logAudit("mac_whitelist_dev", { macAddress: mac, timeLabel });
    return { success: true, message: `Dev mode: whitelisted ${mac}` };
  }

  try {
    await client.connect();

    // Remove any pre-existing hotspot user for this MAC (idempotent re-grant)
    const users = await client.write(["/ip/hotspot/user/print"]);
    const old = (users || []).find(
      (u) => (u["mac-address"] || "").toUpperCase() === mac || u.name === mac
    );
    if (old?.[".id"]) {
      await client.write(["/ip/hotspot/user/remove"], { ".id": old[".id"] });
    }

    // Remove any lingering legacy ip-binding entries
    const bindings = await client.write(["/ip/hotspot/ip-binding/print"]);
    const legacyBinding = (bindings || []).find(
      (b) => (b["mac-address"] || "").toUpperCase() === mac
    );
    if (legacyBinding?.[".id"]) {
      await client.write(["/ip/hotspot/ip-binding/remove"], { ".id": legacyBinding[".id"] });
    }

    // Build the new hotspot user entry
    const userEntry = {
      name: mac,
      "mac-address": mac,
      password: "",                      // empty = MAC-only authentication
      profile: HOTSPOT_PROFILE,
      comment: `Qonnect_${timeLabel}_${new Date().toISOString()}`,
    };

    // Apply data cap if the package defines one
    if (pkg?.dataCapBytes && pkg.dataCapBytes > 0) {
      userEntry["limit-bytes-total"] = String(pkg.dataCapBytes);
    }

    await client.write(["/ip/hotspot/user/add"], userEntry);
    await client.close();

    logAudit("mac_whitelist_success", {
      macAddress: mac,
      timeLabel,
      dataCapBytes: pkg?.dataCapBytes || "unlimited",
    });
    console.log(`✅ Hotspot user created: ${mac} [${timeLabel}]`);
    return { success: true, message: `Whitelisted ${mac}` };
  } catch (err) {
    console.error("❌ MikroTik whitelist error:", err.message);
    logAudit("mac_whitelist_error", { macAddress: mac, timeLabel, error: err.message });
    try { await client.close(); } catch (_) {}
    return { success: false, message: err.message };
  }
}

/**
 * Disconnect a device by MAC address.
 * Removes: active session + hotspot user + any legacy ip-binding.
 * This prevents the device from re-authenticating without a new payment.
 */
async function disconnectByMac(macAddress) {
  const validation = validateMACFormat(macAddress);
  if (!validation.valid) {
    return { success: false, message: validation.error };
  }

  const mac = validation.normalized;
  const client = getClient();

  if (!client) {
    console.log(`📝 [DEV] Would disconnect ${mac}`);
    return { success: true, message: `Dev mode: disconnected ${mac}` };
  }

  try {
    await client.connect();

    // 1. Kick the active hotspot session
    const active = await client.write(["/ip/hotspot/active/print"]);
    const activeEntry = (active || []).find(
      (a) => (a["mac-address"] || "").toUpperCase() === mac
    );
    if (activeEntry?.[".id"]) {
      await client.write(["/ip/hotspot/active/remove"], { ".id": activeEntry[".id"] });
      console.log(`  ✅ Active session removed: ${mac}`);
    }

    // 2. Remove hotspot user entry (blocks re-auth)
    const users = await client.write(["/ip/hotspot/user/print"]);
    const userEntry = (users || []).find(
      (u) => (u["mac-address"] || "").toUpperCase() === mac || u.name === mac
    );
    if (userEntry?.[".id"]) {
      await client.write(["/ip/hotspot/user/remove"], { ".id": userEntry[".id"] });
      console.log(`  ✅ Hotspot user removed: ${mac}`);
    }

    // 3. Remove any legacy ip-binding bypass entry
    const bindings = await client.write(["/ip/hotspot/ip-binding/print"]);
    const binding = (bindings || []).find(
      (b) => (b["mac-address"] || "").toUpperCase() === mac
    );
    if (binding?.[".id"]) {
      await client.write(["/ip/hotspot/ip-binding/remove"], { ".id": binding[".id"] });
      console.log(`  ✅ IP binding removed: ${mac}`);
    }

    await client.close();
    logAudit("mac_disconnected", { macAddress: mac });
    return { success: true, message: `Disconnected ${mac}` };
  } catch (err) {
    console.error("❌ MikroTik disconnect error:", err.message);
    logAudit("mac_disconnect_error", { macAddress: mac, error: err.message });
    try { await client.close(); } catch (_) {}
    return { success: false, message: err.message };
  }
}

/** Disconnect every active hotspot user (admin emergency action). */
async function disconnectAllUsers() {
  const client = getClient();
  if (!client) return { success: true, message: "Dev mode: disconnected all users" };

  try {
    await client.connect();

    const active = await client.write(["/ip/hotspot/active/print"]);
    let count = 0;
    for (const a of active || []) {
      if (a[".id"]) {
        await client.write(["/ip/hotspot/active/remove"], { ".id": a[".id"] });
        count++;
      }
    }

    // Remove all hotspot users created by this app
    const users = await client.write(["/ip/hotspot/user/print"]);
    for (const u of users || []) {
      if (u.comment?.startsWith("Qonnect_") && u[".id"]) {
        await client.write(["/ip/hotspot/user/remove"], { ".id": u[".id"] });
      }
    }

    await client.close();
    logAudit("disconnect_all_users", { disconnectCount: count });
    console.log(`✅ Disconnected ${count} active sessions`);
    return { success: true, message: `Disconnected ${count} users` };
  } catch (err) {
    console.error("❌ disconnectAllUsers error:", err.message);
    try { await client.close(); } catch (_) {}
    return { success: false, message: err.message };
  }
}

/** Return active devices with traffic stats (bytes-in / bytes-out). */
async function getActiveDevices() {
  const client = getClient();
  if (!client) return { success: true, data: [] };

  try {
    await client.connect();
    const active = await client.write(["/ip/hotspot/active/print"]);
    await client.close();

    return {
      success: true,
      data: (active || []).map((a) => ({
        macAddress: a["mac-address"],
        ipAddress: a.address,
        user: a.user,
        uptime: a.uptime,
        bytesIn: Number(a["bytes-in"] || 0),
        bytesOut: Number(a["bytes-out"] || 0),
      })),
    };
  } catch (err) {
    console.error("❌ getActiveDevices error:", err.message);
    try { await client.close(); } catch (_) {}
    return { success: false, error: err.message };
  }
}

/**
 * Return a Set of currently active MAC addresses (uppercase).
 * Used by the session-sync worker to detect idle/MikroTik-initiated disconnects.
 */
async function getActiveMACSet() {
  const client = getClient();
  if (!client) return { success: true, macs: new Set() };

  try {
    await client.connect();
    const active = await client.write(["/ip/hotspot/active/print"]);
    await client.close();

    const macs = new Set(
      (active || [])
        .map((a) => (a["mac-address"] || "").toUpperCase())
        .filter(Boolean)
    );
    return { success: true, macs };
  } catch (err) {
    console.error("❌ getActiveMACSet error:", err.message);
    try { await client.close(); } catch (_) {}
    return { success: false, macs: new Set(), error: err.message };
  }
}

/** Test connectivity and return router identity + connected user count. */
async function getStatus() {
  const client = getClient();
  if (!client) {
    return { success: true, data: { status: "ok", connectedUsers: 0, mode: "dev" } };
  }

  try {
    await client.connect();
    const [active, identity] = await Promise.all([
      client.write(["/ip/hotspot/active/print"]),
      client.write(["/system/identity/print"]),
    ]);
    await client.close();

    return {
      success: true,
      data: {
        status: "ok",
        connectedUsers: (active || []).length,
        identity: identity?.[0]?.name || "Unknown",
        mode: "live",
      },
    };
  } catch (err) {
    console.error("❌ MikroTik getStatus error:", err.message);
    try { await client.close(); } catch (_) {}
    return { success: false, error: err.message, data: { status: "error" } };
  }
}

module.exports = {
  RouterOSClient,
  MIKROTIK_ENABLED,
  validateMACFormat,
  ensureHotspotProfiles,
  whitelistMAC,
  disconnectByMac,
  disconnectAllUsers,
  getActiveDevices,
  getActiveMACSet,
  getStatus,
};
