/**
 * prisma/seed.js
 *
 * A-1 FIX: Idempotent seed for fresh deployments.
 *
 * Creates:
 *   1. The SystemSettings singleton row (id = 1) — the application requires
 *      this row to exist; any code path that calls prisma.systemsettings.findUnique
 *      returns null on a fresh DB, causing silent failures.
 *   2. A default admin account — without it there is no way to log into the
 *      dashboard on a fresh install.
 *
 * Both operations use upsert so this script is safe to re-run at any time
 * (e.g. in CI, after a wipe, or when adding new SystemSettings defaults).
 *
 * Override credentials via env vars before running:
 *   SEED_ADMIN_EMAIL=admin@example.com
 *   SEED_ADMIN_PASSWORD=ChangeMe123!
 *
 * Usage:
 *   npx prisma db seed          (invoked automatically by prisma migrate reset)
 *   node prisma/seed.js         (manual run)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ── Configurable defaults ─────────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || 'admin@qonnect.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
const BCRYPT_ROUNDS  = 12;

async function main() {
  // ── 1. SystemSettings singleton ─────────────────────────────────────────────
  // L-2 CONTRACT: only ever upsert({ where: { id: 1 } }).
  // Never call prisma.systemsettings.create() directly.
  const settings = await prisma.systemsettings.upsert({
    where:  { id: 1 },
    update: {}, // never overwrite existing operator customisations on re-seed
    create: {
      id:                 1,
      networkName:        'Qonnect',
      adminEmail:         ADMIN_EMAIL,
      maxConcurrentUsers: 100,
      sessionTimeout:     2,
      autoDisconnect:     true,
      currency:           'KSh',
      taxRate:            0,
      paymentGateway:     'mpesa',
      mpesaTimeout:       60,
      defaultPackage:     '1hour',
      maintenanceMode:    false,
      updatedAt:          new Date(),
    },
  });

  console.log(`✅ SystemSettings seeded (id=${settings.id})`);

  // ── 2. Default admin account ─────────────────────────────────────────────────
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin) {
    console.log(`ℹ️  Admin '${ADMIN_EMAIL}' already exists — skipping creation.`);
  } else {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    await prisma.admin.create({
      data: {
        email:     ADMIN_EMAIL,
        password:  hashedPassword,
        role:      'SUPER_ADMIN',
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Default admin created: ${ADMIN_EMAIL}`);
    console.log(`   ⚠️  Change the default password immediately after first login!`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
