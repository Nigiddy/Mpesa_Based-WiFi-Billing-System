/**
 * ARP-based MAC address lookup utility
 *
 * Used to cross-verify that the MAC address submitted by a client
 * actually corresponds to the requesting IP in the ARP table.
 *
 * Only works when the Node process is on the same L2 broadcast domain
 * as the client (i.e., the server is behind the MikroTik router on the
 * same LAN segment). In cloud/VPN deployments this will be unavailable
 * and the function will return null (fail-open).
 */

const { exec } = require('child_process');
const os = require('os');

/**
 * Look up the MAC address for a given IP via the system ARP table.
 *
 * @param {string} ip - IPv4 address to look up
 * @returns {Promise<string|null>} - Uppercase MAC (AA:BB:CC:DD:EE:FF) or null
 */
function getMACFromARP(ip) {
  if (!ip || typeof ip !== 'string') return Promise.resolve(null);

  // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.5)
  const cleanIP = ip.replace(/^::ffff:/, '');

  // Skip loopback — ARP won't have an entry for it
  if (cleanIP === '127.0.0.1' || cleanIP === '::1') return Promise.resolve(null);

  return new Promise((resolve) => {
    const platform = os.platform();

    let cmd;
    if (platform === 'linux') {
      // On Linux, `arp -n <ip>` prints a table row with MAC in the 3rd column
      cmd = `arp -n ${cleanIP}`;
    } else if (platform === 'darwin') {
      // macOS: `arp -n <ip>`
      cmd = `arp -n ${cleanIP}`;
    } else if (platform === 'win32') {
      cmd = `arp -a ${cleanIP}`;
    } else {
      return resolve(null);
    }

    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);

      // Match standard MAC formats: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
      const match = stdout.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
      if (!match) return resolve(null);

      // Normalize to uppercase colon-separated
      const normalized = match[0].replace(/-/g, ':').toUpperCase();
      resolve(normalized);
    });
  });
}

/**
 * Verify that the client-submitted MAC matches the ARP table entry for their IP.
 *
 * Returns an object describing the outcome. On verification failure it is
 * caller's responsibility to decide whether to block or log+allow.
 *
 * @param {string} clientIP        - IP from req.ip (already trust-proxy resolved)
 * @param {string} submittedMAC    - MAC from req.body (normalized uppercase)
 * @returns {Promise<{verified: boolean, arpMAC: string|null, reason: string}>}
 */
async function verifyMACvsARP(clientIP, submittedMAC) {
  try {
    const arpMAC = await getMACFromARP(clientIP);

    if (!arpMAC) {
      // ARP table entry not found — common in dev/cloud environments.
      // Fail open with a warning log so production traffic isn't blocked.
      return {
        verified: false,
        arpMAC: null,
        reason: 'arp_unavailable',
      };
    }

    const normalizedSubmitted = submittedMAC.trim().toUpperCase().replace(/-/g, ':');
    const match = arpMAC === normalizedSubmitted;

    return {
      verified: match,
      arpMAC,
      reason: match ? 'match' : 'mismatch',
    };
  } catch (err) {
    console.error('[ARP] Lookup error:', err.message);
    return { verified: false, arpMAC: null, reason: 'error' };
  }
}

module.exports = { getMACFromARP, verifyMACvsARP };
