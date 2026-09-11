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

// SEC-FIX: Use execFile() instead of exec() to prevent OS Command Injection.
// exec() passes the command through a shell, so any shell metacharacters in
// `cleanIP` (e.g. "; rm -rf /", backticks) would be interpreted.
// execFile() bypasses the shell entirely — the IP is passed as a discrete
// argument and is never interpreted by sh/bash.
const { execFile } = require('child_process');
const os = require('os');

// SEC-FIX: Strict IP allowlist regex used as defence-in-depth.
// Only well-formed IPv4 addresses or compressed IPv6 addresses pass.
// Rejects anything containing shell metacharacters before execFile() is called.
const SAFE_IP_RE = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;

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

  // SEC-FIX: Reject IPs that contain anything other than digits, dots, colons,
  // or hex characters. This is a second gate before the execFile() call.
  if (!SAFE_IP_RE.test(cleanIP)) {
    console.warn('[ARP] Rejected unsafe IP value:', cleanIP);
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const platform = os.platform();

    // SEC-FIX: Build command as [executable, argsArray] for execFile().
    // The IP is passed as a separate element — never interpolated into a string
    // that a shell would interpret. Shell injection is structurally impossible.
    let executable;
    let args;

    if (platform === 'linux' || platform === 'darwin') {
      // `arp -n <ip>` prints a table row with MAC in the 3rd column
      executable = 'arp';
      args = ['-n', cleanIP];
    } else if (platform === 'win32') {
      executable = 'arp';
      args = ['-a', cleanIP];
    } else {
      return resolve(null);
    }

    execFile(executable, args, { timeout: 3000 }, (err, stdout) => {
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
