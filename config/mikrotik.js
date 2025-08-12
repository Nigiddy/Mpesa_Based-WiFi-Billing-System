require("dotenv").config();
const { RouterOSClient } = require("node-routeros");

const MIKROTIK_ENABLED = String(process.env.MIKROTIK_ENABLED || "false").toLowerCase() === "true";

function getClient() {
  if (!MIKROTIK_ENABLED) return null;
  const host = process.env.MIKROTIK_HOST;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;
  const port = Number(process.env.MIKROTIK_PORT || 8728);
  if (!host || !user || !password) return null;
  return new RouterOSClient({ host, user, password, port, timeout: 5000 });
}

async function whitelistMAC(macAddress, timeLabel) {
  if (!macAddress) return { success: false, message: "No MAC provided" };
  const client = getClient();
  if (!client) {
    return { success: true, message: `Dev mode: whitelisted ${macAddress} for ${timeLabel}` };
  }
  try {
    await client.connect();
    // Add hotspot bypass binding (common approach)
    await client.write(["/ip/hotspot/ip-binding/add"], {
      "mac-address": macAddress,
      type: "bypassed",
      comment: `Qonnect ${timeLabel}`,
    });
    await client.close();
    return { success: true, message: `Whitelisted ${macAddress} for ${timeLabel}` };
  } catch (error) {
    return { success: false, message: error.message || String(error) };
  }
}

async function disconnectByMac(macAddress) {
  const client = getClient();
  if (!client) return { success: true, message: `Dev mode: disconnected ${macAddress}` };
  try {
    await client.connect();
    const active = await client.write(["/ip/hotspot/active/print"]);
    const entry = (active || []).find((a) => (a["mac-address"] || "").toLowerCase() === macAddress.toLowerCase());
    if (entry && entry[".id"]) {
      await client.write(["/ip/hotspot/active/remove"], { ".id": entry[".id"] });
    }
    await client.close();
    return { success: true, message: `Disconnected ${macAddress}` };
  } catch (error) {
    return { success: false, message: error.message || String(error) };
  }
}

async function disconnectAllUsers() {
  const client = getClient();
  if (!client) return { success: true, message: "Dev mode: disconnected all users" };
  try {
    await client.connect();
    const active = await client.write(["/ip/hotspot/active/print"]);
    for (const a of active) {
      if (a[".id"]) {
        await client.write(["/ip/hotspot/active/remove"], { ".id": a[".id"] });
      }
    }
    await client.close();
    return { success: true, message: `Disconnected ${active.length} users` };
  } catch (error) {
    return { success: false, message: error.message || String(error) };
  }
}

async function getActiveDevices() {
  const client = getClient();
  if (!client) return { success: true, data: [] };
  try {
    await client.connect();
    const active = await client.write(["/ip/hotspot/active/print"]);
    await client.close();
    const devices = (active || []).map((a) => ({
      macAddress: a["mac-address"],
      ipAddress: a.address,
      user: a.user,
      uptime: a.uptime,
    }));
    return { success: true, data: devices };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

async function getStatus() {
  const client = getClient();
  if (!client) return { success: true, data: { status: "ok", uptime: 0, connectedUsers: 0 } };
  try {
    await client.connect();
    const active = await client.write(["/ip/hotspot/active/print"]);
    await client.close();
    return { success: true, data: { status: "ok", uptime: 0, connectedUsers: (active || []).length } };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

module.exports = { RouterOSClient, whitelistMAC, disconnectByMac, disconnectAllUsers, getActiveDevices, getStatus };

const connectToMikrotik = async () => {
    const client = new RouterOSClient([
        process.env.MIKROTIK_HOST,
        process.env.MIKROTIK_USER,
        process.env.MIKROTIK_PASS
    ]);

    await client.connect();
    return client;
};

const whitelistMAC = async (mac, time) => {
    const durationMap = {
        "1Hr": "1h",
        "4Hrs": "4h",
        "12Hrs": "12h",
        "24Hrs": "1d"
    };

    const duration = durationMap[time];

    if (!duration) return { success: false, message: "Invalid duration" };

    try {
        const client = await connectToMikrotik();

        // Add MAC to bypass IP binding
        await client.write([
            "/ip/hotspot/ip-binding/add",
            `=mac-address=${mac}`,
            "=type=bypassed",
            `=comment=WiFi-Paid-${duration}`
        ]);

        await client.close();
        return { success: true, message: `MAC ${mac} whitelisted for ${duration}` };

    } catch (error) {
        console.error("MikroTik Error:", error);
        return { success: false, message: "MikroTik whitelist failed" };
    }
};

module.exports = { whitelistMAC };
