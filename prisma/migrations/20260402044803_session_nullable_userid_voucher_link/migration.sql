-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `voucherRedemptionId` INTEGER NULL,
    MODIFY `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_voucherRedemptionId_fkey` FOREIGN KEY (`voucherRedemptionId`) REFERENCES `VoucherRedemption`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
