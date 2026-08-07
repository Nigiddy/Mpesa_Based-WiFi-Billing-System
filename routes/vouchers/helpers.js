/**
 * Voucher shared utilities
 * - generateVoucherCode()  – cryptographically random, non-guessable code
 * - deriveVoucherStatus()  – computes runtime status from DB fields
 * - serializeBigInts()     – M-5 FIX: centralised here instead of duplicated in generate.js + list.js
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically random voucher code.
 * Format: XXXX-XXXX-XXXX-XXXX  (16 uppercase hex chars in 4 groups)
 * Example: A3F2-9C1E-7D04-B8A5
 *
 * Uses crypto.randomBytes for 64-bit entropy — never sequential or guessable.
 */
function generateVoucherCode() {
  const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

/**
 * Derive the runtime status of a voucher from its stored fields.
 * @returns {'unused' | 'active' | 'fully_used' | 'expired'}
 */
function deriveVoucherStatus(voucher) {
  const now = new Date();
  const currentUses = typeof voucher.currentUses === 'number' ? voucher.currentUses : 0;
  const maxUses = typeof voucher.maxUses === 'number' ? voucher.maxUses : 1;

  if (voucher.expiresAt && now > voucher.expiresAt) return 'expired';
  if (currentUses >= maxUses) return 'fully_used';
  if (currentUses === 0) return 'unused';
  return 'active'; // partially used (maxUses > 1)
}

/**
 * Recursively convert BigInt values to strings so the object is JSON-serialisable.
 * Prisma returns BigInt for some aggregate/count fields; JSON.stringify does not
 * handle BigInt natively and will throw without this transformation.
 *
 * M-5 FIX: Previously duplicated verbatim in generate.js and list.js.
 * Now lives here as the single source of truth.
 */
function serializeBigInts(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serializeBigInts);
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = serializeBigInts(value[key]);
    }
    return out;
  }
  return value;
}

module.exports = { generateVoucherCode, deriveVoucherStatus, serializeBigInts };
