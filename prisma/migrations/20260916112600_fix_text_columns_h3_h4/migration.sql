-- H-3: AuditLog.details was VARCHAR(191) — silently truncating JSON payloads.
-- H-4: SupportRequest.message was VARCHAR(191) but validation allows 5000 chars.
-- Both columns are changed to TEXT (up to 65 535 bytes) which is sufficient for
-- all realistic payloads without bloating the row with MEDIUMTEXT/LONGTEXT.

-- AlterTable
ALTER TABLE `auditlog` MODIFY `details` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `supportrequest` MODIFY `message` TEXT NOT NULL;
