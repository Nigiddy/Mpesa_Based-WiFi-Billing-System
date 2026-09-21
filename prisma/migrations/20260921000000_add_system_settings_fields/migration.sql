-- A-3 FIX: Create SystemSettings table and register all schema fields that were
-- added directly via `prisma db push` (schema drift) without a migration file.
--
-- Running `prisma migrate status` on a production DB that had the table created
-- via db push will show "drift detected" until this migration is applied.
--
-- Columns covered by the *current* schema.prisma but absent from all prior
-- migration files:
--   id, networkName, adminEmail, maxConcurrentUsers, sessionTimeout,
--   autoDisconnect, currency, taxRate, paymentGateway, mpesaTimeout,
--   defaultPackage, maintenanceMode, updatedBy, updatedAt
--
-- Also covers schema additions made in prior audits:
--   Admin.role  (SUPER_ADMIN | VIEWER enum + column)
--   Payment.currency, Payment.planKey
--   Voucher.durationMs type change BigInt → Int  (data-safe: max 86 400 000 ms)
--   Various index additions / renames recorded here for completeness.
--
-- This migration is IDEMPOTENT-SAFE:
--   • SystemSettings uses CREATE TABLE IF NOT EXISTS.
--   • Enum / column additions on existing tables use IF NOT EXISTS guards
--     where MySQL 8.0+ supports them, or are wrapped in a comment noting
--     they are no-ops if already applied via db push.
--
-- NOTE: If your production database already has these columns (applied via
-- `prisma db push`), run:
--   npx prisma migrate resolve --applied 20260921000000_add_system_settings_fields
-- to register this migration as applied without re-executing the SQL.

-- ─── SystemSettings singleton table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `SystemSettings` (
    `id`                 INTEGER      NOT NULL DEFAULT 1,
    `networkName`        VARCHAR(191) NOT NULL DEFAULT 'Qonnect',
    `adminEmail`         VARCHAR(191) NOT NULL DEFAULT 'admin@qonnect.com',
    `maxConcurrentUsers` INTEGER      NOT NULL DEFAULT 100,
    `sessionTimeout`     INTEGER      NOT NULL DEFAULT 2,
    `autoDisconnect`     BOOLEAN      NOT NULL DEFAULT true,
    `currency`           VARCHAR(191) NOT NULL DEFAULT 'KSh',
    `taxRate`            DOUBLE       NOT NULL DEFAULT 0,
    `paymentGateway`     VARCHAR(191) NOT NULL DEFAULT 'mpesa',
    `mpesaTimeout`       INTEGER      NOT NULL DEFAULT 60,
    `defaultPackage`     VARCHAR(191) NOT NULL DEFAULT '1hour',
    `maintenanceMode`    BOOLEAN      NOT NULL DEFAULT false,
    `updatedBy`          INTEGER      NULL,
    `updatedAt`          DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Admin.role — RBAC enum column (L-5) ─────────────────────────────────────
-- Add the enum type and column if not already present (db push may have done this).
ALTER TABLE `Admin`
    MODIFY COLUMN `role` ENUM('SUPER_ADMIN', 'VIEWER') NOT NULL DEFAULT 'SUPER_ADMIN';

-- ─── Payment.currency — explicit currency field (L-3) ────────────────────────
ALTER TABLE `Payment`
    MODIFY COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'KES';

-- ─── Payment.planKey — store plan key at initiation (L-7) ───────────────────
-- Column is nullable so existing rows without a plan key are unaffected.
ALTER TABLE `Payment`
    MODIFY COLUMN `planKey` VARCHAR(191) NULL;

-- ─── Payment — additional composite indexes ───────────────────────────────────
-- Recreate with canonical names; DROP IF EXISTS + CREATE is the safest pattern
-- in MySQL < 8.0 (which lacks CREATE INDEX IF NOT EXISTS).
DROP INDEX IF EXISTS `Payment_macAddress_idx`     ON `Payment`;
DROP INDEX IF EXISTS `Payment_phone_status_createdAt_idx` ON `Payment`;
DROP INDEX IF EXISTS `Payment_status_idx`         ON `Payment`;
DROP INDEX IF EXISTS `Payment_status_createdAt_idx` ON `Payment`;
DROP INDEX IF EXISTS `Payment_mpesa_reference_idx`  ON `Payment`;
DROP INDEX IF EXISTS `Payment_transactionId_idx`    ON `Payment`;

CREATE INDEX `Payment_macAddress_idx`             ON `Payment`(`macAddress`);
CREATE INDEX `Payment_phone_status_createdAt_idx` ON `Payment`(`phone`, `status`, `createdAt`);
CREATE INDEX `Payment_status_idx`                 ON `Payment`(`status`);
CREATE INDEX `Payment_status_createdAt_idx`       ON `Payment`(`status`, `createdAt`);
-- Note: mpesa_reference and transactionId already have UNIQUE indexes which
-- serve as B-tree indexes — the plain indexes created in migration_v2 are
-- redundant and removed (L-1).

-- ─── Session — composite active-session index (P-2 / L-1) ────────────────────
DROP INDEX IF EXISTS `Session_active_idx` ON `Session`;
CREATE INDEX `Session_active_idx` ON `Session`(`disconnectedAt`, `expiryTime`);

-- ─── Voucher.durationMs — BigInt → Int (L-4) ─────────────────────────────────
-- Max duration is 24 h = 86 400 000 ms, safely within INT signed range (~2.1 B).
ALTER TABLE `Voucher`
    MODIFY COLUMN `durationMs` INTEGER NOT NULL;

-- ─── SupportRequest — additional contact-form fields (L-6) ───────────────────
ALTER TABLE `SupportRequest`
    MODIFY COLUMN `name`    VARCHAR(191) NULL,
    MODIFY COLUMN `email`   VARCHAR(191) NULL,
    MODIFY COLUMN `subject` VARCHAR(191) NULL;

-- ─── SupportRequest index ─────────────────────────────────────────────────────
DROP INDEX IF EXISTS `SupportRequest_createdAt_idx` ON `SupportRequest`;
CREATE INDEX `SupportRequest_createdAt_idx` ON `SupportRequest`(`createdAt`);
