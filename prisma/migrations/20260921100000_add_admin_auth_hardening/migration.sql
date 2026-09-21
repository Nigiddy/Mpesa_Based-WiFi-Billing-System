-- AUTH-W2: Add failed login attempt tracking columns to the Admin table.
--
-- failedAttempts — incremented on every bad password; reset to 0 on success.
-- lockedUntil    — when set to a future timestamp, the login route rejects all
--                  attempts until the lock expires (temporary lockout).
--
-- Both columns carry safe defaults so existing rows are NOT affected:
--   failedAttempts = 0  (no attempts counted yet)
--   lockedUntil    = NULL (not locked)
--
-- This migration is idempotent-safe with ADD COLUMN IF NOT EXISTS (MySQL 8.0+).
-- For MySQL 5.7 compatibility the raw ALTER is used — re-running on an already
-- migrated DB will fail harmlessly with "Duplicate column name"; wrap in a
-- stored procedure if your deployment tool requires strict idempotency.

ALTER TABLE `Admin`
    ADD COLUMN `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lockedUntil`    DATETIME(3) NULL;
