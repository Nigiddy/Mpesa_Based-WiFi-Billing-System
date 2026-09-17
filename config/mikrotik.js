/**
 * MikroTik Integration Service (v5 — per-plan profiles + enforcement)
 *
 * Architecture: Uses /ip/hotspot/user (not ip-binding/bypassed) so that:
 *  - MikroTik profile idle-timeout natively kicks idle devices
 *  - Data cap enforcement via limit-bytes-total on the hotspot user
 *  - Active users visible in /ip/hotspot/active for monitoring & sync
 *
 * MikroTik prerequisite:
 *  - Hotspot must be configured to allow MAC-address login (no password popup)
 *  - ensureHotspotProfiles() is called on app startup to create all plan profiles
 *
 * Production changes (v4):
 *  - Persistent singleton connection with auto-reconnect (P-1)
 *  - All print queries use server-side MAC filters (P-2, P-3)
 *  - getActiveMACSet + getActiveDevices merged into getActiveSessions() (P-2)
 *  - All client.write() calls wrapped with a 4-second app-level timeout (P-4)
 *  - Socket-level timeout reduced to 5 s (P-4)
 *  - closeMikrotikConnection() exported for graceful shutdown (P-5)
 *
 * New in v5:
 *  - One RouterOS hotspot user-profile per plan, each with rate-limit (F-1, F-2)
 *  - whitelistMAC() assigns the per-plan profile (F-1, F-2)
 *  - ensureHotspotProfiles() loops PACKAGES and upserts all plan profiles (F-1)
 */

require("dotenv").config();
const { RouterOSAPI } = require("node-routeros");
const { logAudit } = require("../utils/auditLogger");
const { PACKAGES } = require("../lib/packages");

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

/**
 * Race a RouterOS write() promise against a hard wall-clock deadline.
 * Prevents the payment hot path from blocking for the full 5-second socket
 * timeout before reaching the COMPLETED_BUT_MAC_FAILED fallback.
 *
 * @param {Promise} promise  - The client.write() promise to race.
 * @param {number}  ms       - App-level deadline in milliseconds (default 4 s).
 * @param {string}  label    - Human label for the timeout error message.
 */
function withTimeout(promise, ms = 4000, label = "MikroTik") {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} call timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Persistent singleton connection (P-1)
// ---------------------------------------------------------------------------

/** Cached singleton client; null until first getMikrotikClient() call. */
let _client = null;
/** Prevent concurrent reconnection races. */
let _connectingPromise = null;

/**
 * Build the RouterOSAPI options from env vars.
 * Separated so it can be called on reconnect without repeating the logic.
 */
function buildClientOptions() {
  const host = process.env.MIKROTIK_HOST;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;

  if (!host || !user || !password) {
    return null;
  }

  const tlsEnv = process.env.MIKROTIK_USE_TLS;
  const useTls = tlsEnv !== undefined
    ? String(tlsEnv).toLowerCase() === "true"
    : process.env.NODE_ENV === "production";

  if (!useTls && process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  SECURITY WARNING: MikroTik TLS is DISABLED in production! " +
      "Credentials and commands are transmitted unencrypted over the network. " +
      "Enable MIKROTIK_USE_TLS=true and configure 'api-ssl' (port 8729) on RouterOS."
    );
  }

  let port;
  if (process.env.MIKROTIK_PORT) {
    port = Number(process.env.MIKROTIK_PORT);
  } else {
    port = useTls ? 8729 : 8728;
  }

  return { host, user, password, port, tls: useTls, timeout: 5000 };
}

/**
 * Return the live, connected RouterOS client (singleton).
 * On first call (or after a fatal disconnect) it connects and caches the
 * instance. If MikroTik is disabled or credentials are missing, returns null.
 *
 * @returns {Promise<RouterOSAPI|null>}
 */
async function getMikrotikClient() {
  if (!MIKROTIK_ENABLED) return null;

  // Already have a connected client — return it immediately
  if (_client) return _client;

  // Another call is already connecting — wait for that promise
  if (_connectingPromise) return _connectingPromise;

  const opts = buildClientOptions();
  if (!opts) {
    console.error("❌ MikroTik: missing MIKROTIK_HOST / MIKROTIK_USER / MIKROTIK_PASSWORD");
    return null;
  }

  _connectingPromise = (async () => {
    try {
      const client = new RouterOSAPI(opts);

      // When the connection dies, clear the singleton so the next call reconnects
      client.on("error", (err) => {
        console.error("❌ MikroTik connection error:", err.message);
        _client = null;
      });
      client.on("close", () => {
        console.warn("⚠️  MikroTik connection closed — will reconnect on next call.");
        _client = null;
      });

      await client.connect();
      console.log("✅ MikroTik persistent connection established.");
      _client = client;
      return _client;
    } catch (err) {
      console.error("❌ MikroTik connect failed:", err.message);
      _client = null;
      return null;
    } finally {
      _connectingPromise = null;
    }
  })();

  return _connectingPromise;
}

/**
 * Explicitly close the persistent MikroTik connection.
 * Call this from closeWorkers() during SIGTERM / SIGINT.
 */
async function closeMikrotikConnection() {
  if (_client) {
    try {
      await _client.close();
      console.log("✅ MikroTik connection closed gracefully.");
    } catch (err) {
      console.error("⚠️  Error closing MikroTik connection:", err.message);
    } finally {
      _client = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Startup profile setup
// ---------------------------------------------------------------------------

/**
 * Create / update one RouterOS hotspot user-profile for every plan in PACKAGES.
 * Must be called once at application startup.
 *
 * Each profile carries:
 *  - rate-limit     : per-plan download/upload speed cap (e.g. "2M/1M")
 *  - idle-timeout   : kicks devices that stop sending traffic
 *  - session-timeout: 0 — the app handles hard expiry via BullMQ
 *  - keepalive-timeout: 2 minutes
 */
async function ensureHotspotProfiles() {
  const client = await getMikrotikClient();
  if (!client) {
    console.log("ℹ️  MikroTik disabled — skipping profile setup.");
    return { success: true, mode: "dev" };
  }

  try {
    // Fetch all existing profiles once (avoids N round-trips for the exists check)
    const existing = await withTimeout(
      client.write(["/ip/hotspot/user-profile/print"]),
      4000,
      "ensureHotspotProfiles/print"
    );
    const existingByName = new Map((existing || []).map((p) => [p.name, p]));

    const results = [];
    for (const pkg of Object.values(PACKAGES)) {
      const { profileName, rateLimit, idleTimeoutSec } = pkg;
      const idleFmt = fmtSeconds(idleTimeoutSec || IDLE_TIMEOUT_SEC);

      const profileParams = {
        "idle-timeout":     idleFmt,
        "session-timeout":  "0",          // BullMQ handles hard expiry
        "keepalive-timeout": "00:02:00",
        "rate-limit":       rateLimit,
      };

      const found = existingByName.get(profileName);
      if (found) {
        await withTimeout(
          client.write(["/ip/hotspot/user-profile/set"], {
            ".id": found[".id"],
            ...profileParams,
          }),
          4000,
          `ensureHotspotProfiles/set/${profileName}`
        );
        console.log(`✅ MikroTik profile '${profileName}' updated (rate-limit=${rateLimit}, idle=${idleFmt})`);
      } else {
        await withTimeout(
          client.write(["/ip/hotspot/user-profile/add"], {
            name: profileName,
            ...profileParams,
          }),
          4000,
          `ensureHotspotProfiles/add/${profileName}`
        );
        console.log(`✅ MikroTik profile '${profileName}' created (rate-limit=${rateLimit}, idle=${idleFmt})`);
      }
      results.push({ profileName, rateLimit, action: found ? "updated" : "created" });
    }

    return { success: true, profiles: results };
  } catch (err) {
    console.error("❌ MikroTik profile setup failed:", err.message);
    logAudit("mikrotik_profile_setup_error", { error: err.message });
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
  const client = await getMikrotikClient();

  if (!client) {
    console.log(`📝 [DEV] Would whitelist ${mac} for ${timeLabel}`);
    logAudit("mac_whitelist_dev", { macAddress: mac, timeLabel });
    return { success: true, message: `Dev mode: whitelisted ${mac}` };
  }

  try {
    // Remove any pre-existing hotspot user for this MAC — server-side filter (P-3)
    const users = await withTimeout(
      client.write([
        "/ip/hotspot/user/print",
        `?mac-address=${mac}`,
        "=.proplist=.id,mac-address,name",
      ]),
      4000,
      "whitelistMAC/user/print"
    );
    const old = (users || [])[0];
    if (old?.[".id"]) {
      await withTimeout(
        client.write(["/ip/hotspot/user/remove"], { ".id": old[".id"] }),
        4000,
        "whitelistMAC/user/remove"
      );
    }

    // Remove any lingering legacy ip-binding entries — server-side filter (P-3)
    const bindings = await withTimeout(
      client.write([
        "/ip/hotspot/ip-binding/print",
        `?mac-address=${mac}`,
        "=.proplist=.id,mac-address",
      ]),
      4000,
      "whitelistMAC/ip-binding/print"
    );
    const legacyBinding = (bindings || [])[0];
    if (legacyBinding?.[".id"]) {
      await withTimeout(
        client.write(["/ip/hotspot/ip-binding/remove"], { ".id": legacyBinding[".id"] }),
        4000,
        "whitelistMAC/ip-binding/remove"
      );
    }

    // Build the new hotspot user entry.
    // Assign the per-plan profile so the router enforces the correct speed cap.
    // Fall back to HOTSPOT_PROFILE only if no package was supplied.
    const assignedProfile = pkg?.profileName || HOTSPOT_PROFILE;
    const userEntry = {
      name: mac,
      "mac-address": mac,
      password: "",                      // empty = MAC-only authentication
      profile: assignedProfile,
      comment: `Qonnect_${timeLabel}_${new Date().toISOString()}`,
    };

    // Apply data cap if the package defines one
    if (pkg?.dataCapBytes && pkg.dataCapBytes > 0) {
      userEntry["limit-bytes-total"] = String(pkg.dataCapBytes);
    }

    await withTimeout(
      client.write(["/ip/hotspot/user/add"], userEntry),
      4000,
      "whitelistMAC/user/add"
    );

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
    // Invalidate the singleton so the next call reconnects
    if (err.message.includes("timed out") || err.message.includes("closed")) {
      _client = null;
    }
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
  const client = await getMikrotikClient();

  if (!client) {
    console.log(`📝 [DEV] Would disconnect ${mac}`);
    return { success: true, message: `Dev mode: disconnected ${mac}` };
  }

  try {
    // 1. Kick the active hotspot session — server-side filter (P-3)
    const active = await withTimeout(
      client.write([
        "/ip/hotspot/active/print",
        `?mac-address=${mac}`,
        "=.proplist=.id,mac-address",
      ]),
      4000,
      "disconnectByMac/active/print"
    );
    const activeEntry = (active || [])[0];
    if (activeEntry?.[".id"]) {
      await withTimeout(
        client.write(["/ip/hotspot/active/remove"], { ".id": activeEntry[".id"] }),
        4000,
        "disconnectByMac/active/remove"
      );
      console.log(`  ✅ Active session removed: ${mac}`);
    }

    // 2. Remove hotspot user entry — server-side filter (P-3)
    const users = await withTimeout(
      client.write([
        "/ip/hotspot/user/print",
        `?mac-address=${mac}`,
        "=.proplist=.id,mac-address,name",
      ]),
      4000,
      "disconnectByMac/user/print"
    );
    const userEntry = (users || [])[0];
    if (userEntry?.[".id"]) {
      await withTimeout(
        client.write(["/ip/hotspot/user/remove"], { ".id": userEntry[".id"] }),
        4000,
        "disconnectByMac/user/remove"
      );
      console.log(`  ✅ Hotspot user removed: ${mac}`);
    }

    // 3. Remove any legacy ip-binding bypass entry — server-side filter (P-3)
    const bindings = await withTimeout(
      client.write([
        "/ip/hotspot/ip-binding/print",
        `?mac-address=${mac}`,
        "=.proplist=.id,mac-address",
      ]),
      4000,
      "disconnectByMac/ip-binding/print"
    );
    const binding = (bindings || [])[0];
    if (binding?.[".id"]) {
      await withTimeout(
        client.write(["/ip/hotspot/ip-binding/remove"], { ".id": binding[".id"] }),
        4000,
        "disconnectByMac/ip-binding/remove"
      );
      console.log(`  ✅ IP binding removed: ${mac}`);
    }

    logAudit("mac_disconnected", { macAddress: mac });
    return { success: true, message: `Disconnected ${mac}` };
  } catch (err) {
    console.error("❌ MikroTik disconnect error:", err.message);
    logAudit("mac_disconnect_error", { macAddress: mac, error: err.message });
    if (err.message.includes("timed out") || err.message.includes("closed")) {
      _client = null;
    }
    return { success: false, message: err.message };
  }
}

/** Disconnect every active hotspot user (admin emergency action). */
async function disconnectAllUsers() {
  const client = await getMikrotikClient();
  if (!client) return { success: true, message: "Dev mode: disconnected all users" };

  try {
    const active = await withTimeout(
      client.write(["/ip/hotspot/active/print"]),
      4000,
      "disconnectAllUsers/active/print"
    );
    let count = 0;
    for (const a of active || []) {
      if (a[".id"]) {
        await withTimeout(
          client.write(["/ip/hotspot/active/remove"], { ".id": a[".id"] }),
          4000,
          "disconnectAllUsers/active/remove"
        );
        count++;
      }
    }

    // Remove all hotspot users created by this app
    const users = await withTimeout(
      client.write(["/ip/hotspot/user/print"]),
      4000,
      "disconnectAllUsers/user/print"
    );
    for (const u of users || []) {
      if (u.comment?.startsWith("Qonnect_") && u[".id"]) {
        await withTimeout(
          client.write(["/ip/hotspot/user/remove"], { ".id": u[".id"] }),
          4000,
          "disconnectAllUsers/user/remove"
        );
      }
    }

    logAudit("disconnect_all_users", { disconnectCount: count });
    console.log(`✅ Disconnected ${count} active sessions`);
    return { success: true, message: `Disconnected ${count} users` };
  } catch (err) {
    console.error("❌ disconnectAllUsers error:", err.message);
    if (err.message.includes("timed out") || err.message.includes("closed")) {
      _client = null;
    }
    return { success: false, message: err.message };
  }
}

/**
 * Return both the set of active MACs and the full device stats in a single
 * RouterOS round-trip. Replaces the separate getActiveMACSet() and
 * getActiveDevices() calls that previously each opened their own connection.
 *
 * @returns {Promise<{success: boolean, macs: Set<string>, devices: Array, error?: string}>}
 */
async function getActiveSessions() {
  const client = await getMikrotikClient();
  if (!client) {
    return { success: true, macs: new Set(), devices: [] };
  }

  try {
    const active = await withTimeout(
      client.write(["/ip/hotspot/active/print"]),
      4000,
      "getActiveSessions/print"
    );

    const rows = active || [];
    const macs = new Set(
      rows
        .map((a) => (a["mac-address"] || "").toUpperCase())
        .filter(Boolean)
    );
    const devices = rows.map((a) => ({
      macAddress: a["mac-address"],
      ipAddress: a.address,
      user: a.user,
      uptime: a.uptime,
      bytesIn: Number(a["bytes-in"] || 0),
      bytesOut: Number(a["bytes-out"] || 0),
    }));

    return { success: true, macs, devices };
  } catch (err) {
    console.error("❌ getActiveSessions error:", err.message);
    if (err.message.includes("timed out") || err.message.includes("closed")) {
      _client = null;
    }
    return { success: false, macs: new Set(), devices: [], error: err.message };
  }
}

/**
 * Return a Set of currently active MAC addresses (uppercase).
 * Thin wrapper around getActiveSessions() for backward-compatibility.
 * Prefer calling getActiveSessions() directly when you also need device stats.
 */
async function getActiveMACSet() {
  const result = await getActiveSessions();
  return { success: result.success, macs: result.macs, error: result.error };
}

/** Return active devices with traffic stats (bytes-in / bytes-out).
 *  Thin wrapper around getActiveSessions() for backward-compatibility.
 */
async function getActiveDevices() {
  const result = await getActiveSessions();
  return {
    success: result.success,
    data: result.devices,
    error: result.error,
  };
}

/** Test connectivity and return router identity + connected user count. */
async function getStatus() {
  const client = await getMikrotikClient();
  if (!client) {
    return { success: true, data: { status: "ok", connectedUsers: 0, mode: "dev" } };
  }

  try {
    const [active, identity] = await Promise.all([
      withTimeout(client.write(["/ip/hotspot/active/print"]), 4000, "getStatus/active"),
      withTimeout(client.write(["/system/identity/print"]), 4000, "getStatus/identity"),
    ]);

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
    if (err.message.includes("timed out") || err.message.includes("closed")) {
      _client = null;
    }
    return { success: false, error: err.message, data: { status: "error" } };
  }
}

module.exports = {
  MIKROTIK_ENABLED,
  validateMACFormat,
  ensureHotspotProfiles,
  whitelistMAC,
  disconnectByMac,
  disconnectAllUsers,
  getActiveSessions,
  getActiveDevices,
  getActiveMACSet,
  getStatus,
  closeMikrotikConnection,
};
