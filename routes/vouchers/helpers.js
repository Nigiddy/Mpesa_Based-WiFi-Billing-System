/**
 * Voucher shared utilities
 * - generateVoucherCode()  – cryptographically random, non-guessable code
 * - deriveVoucherStatus()  – computes runtime status from DB fields
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
  if (voucher.expiresAt && now > voucher.expiresAt) return 'expired';
  if (voucher.currentUses >= voucher.maxUses)        return 'fully_used';
  if (voucher.currentUses === 0)                     return 'unused';
  return 'active'; // partially used (maxUses > 1)
}

module.exports = { generateVoucherCode, deriveVoucherStatus };
