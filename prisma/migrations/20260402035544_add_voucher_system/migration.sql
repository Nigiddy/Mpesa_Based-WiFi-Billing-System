-- CreateTable
CREATE TABLE `Voucher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `planKey` VARCHAR(191) NOT NULL,
    `durationMs` BIGINT NOT NULL,
    `maxUses` INTEGER NOT NULL DEFAULT 1,
    `currentUses` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Voucher_code_key`(`code`),
    INDEX `Voucher_code_idx`(`code`),
    INDEX `Voucher_planKey_idx`(`planKey`),
    INDEX `Voucher_expiresAt_idx`(`expiresAt`),
    INDEX `Voucher_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VoucherRedemption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voucherId` INTEGER NOT NULL,
    `macAddress` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `redeemedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VoucherRedemption_voucherId_idx`(`voucherId`),
    INDEX `VoucherRedemption_macAddress_idx`(`macAddress`),
    INDEX `VoucherRedemption_redeemedAt_idx`(`redeemedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Payment_phone_status_createdAt_idx` ON `Payment`(`phone`, `status`, `createdAt`);

-- AddForeignKey
ALTER TABLE `VoucherRedemption` ADD CONSTRAINT `VoucherRedemption_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
