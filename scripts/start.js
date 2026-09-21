/**
 * scripts/start.js
 *
 * A-2 FIX: Production launcher — runs `prisma migrate deploy` to completion
 * before starting the Express server.
 *
 * PM2's `script` field does NOT invoke a shell, so shell operators like `&&`
 * are not available. This Node launcher bridges that gap cross-platform
 * (works on Linux, Windows, macOS) without requiring bash.
 *
 * ecosystem.config.js points at this file:
 *   script: 'scripts/start.js'
 *
 * Sequence:
 *   1. prisma migrate deploy  — applies any pending migrations (exits non-zero
 *      on failure, which PM2 treats as a crash and will not start the server)
 *   2. require('../index.js') — loads and starts the Express application
 */

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

// ── Step 1: Apply pending migrations ─────────────────────────────────────────
console.log('[start] Running prisma migrate deploy...');
try {
  // Use execFileSync (no shell) for security; resolve the prisma binary from
  // node_modules so this works even if prisma is not on PATH globally.
  const prismaBin = path.resolve(__dirname, '..', 'node_modules', '.bin', 'prisma');
  execFileSync(prismaBin, ['migrate', 'deploy'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
  console.log('[start] Migrations applied successfully.');
} catch (err) {
  // execFileSync throws on non-zero exit; stderr was already forwarded via
  // stdio: 'inherit', so just exit with the same code.
  console.error('[start] prisma migrate deploy failed — aborting server start.');
  process.exit(err.status ?? 1);
}

// ── Step 2: Start the Express server ─────────────────────────────────────────
console.log('[start] Starting server (index.js)...');
require('../index.js');
