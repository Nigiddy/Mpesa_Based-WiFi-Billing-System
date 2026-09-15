-- Migration: remove_user_denorm_counters
-- Removes the denormalized totalSpent and sessionsCount columns from the User
-- table. These fields were never written to anywhere in the codebase and have
-- been replaced by live aggregation queries in the admin CSV export endpoint.
--
-- NOTE: This migration was applied to the live database via `prisma db push`
-- before this file was created. `prisma migrate resolve --applied` was used
-- to register it in the migration history without re-running the SQL.

ALTER TABLE `User`
  DROP COLUMN `sessionsCount`,
  DROP COLUMN `totalSpent`;
