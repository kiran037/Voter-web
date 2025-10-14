-- CreateTable
CREATE TABLE `User` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(20) NOT NULL,
    `name` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
    `phoneVerifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthOtp` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(20) NOT NULL,
    `purpose` ENUM('LOGIN', 'VERIFY_PHONE') NOT NULL DEFAULT 'LOGIN',
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuthOtp_phone_purpose_expiresAt_idx`(`phone`, `purpose`, `expiresAt`),
    INDEX `AuthOtp_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthSession` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `AuthSession_tokenHash_key`(`tokenHash`),
    INDEX `AuthSession_userId_status_idx`(`userId`, `status`),
    INDEX `AuthSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Voter` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `voterId` VARCHAR(64) NULL,
    `age` INTEGER UNSIGNED NULL,
    `gender` ENUM('M', 'F', 'O') NULL,
    `village` VARCHAR(191) NULL,
    `houseNo` VARCHAR(64) NULL,
    `address` VARCHAR(512) NULL,
    `boothName` VARCHAR(191) NULL,
    `boothNo` INTEGER UNSIGNED NULL,
    `partNo` INTEGER UNSIGNED NULL,
    `srn` INTEGER UNSIGNED NULL,
    `mobile1` VARCHAR(20) NULL,
    `mobile2` VARCHAR(20) NULL,
    `email` VARCHAR(191) NULL,
    `colourCode` ENUM('OUR', 'OPPOSITE', 'DOUBTFUL', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `voted` BOOLEAN NOT NULL DEFAULT false,
    `starVoter` BOOLEAN NOT NULL DEFAULT false,
    `dead` BOOLEAN NOT NULL DEFAULT false,
    `caste` VARCHAR(191) NULL,
    `profession` VARCHAR(191) NULL,
    `personnel` VARCHAR(191) NULL,
    `society` VARCHAR(191) NULL,
    `flatNo` VARCHAR(64) NULL,
    `newAddress` VARCHAR(512) NULL,
    `demands` VARCHAR(512) NULL,
    `extraInfo1` VARCHAR(512) NULL,
    `extraInfo2` VARCHAR(512) NULL,
    `extraInfo3` VARCHAR(512) NULL,
    `extraInfo4` VARCHAR(512) NULL,
    `extraInfo5` VARCHAR(512) NULL,
    `extraCheck1` BOOLEAN NULL,
    `extraCheck2` BOOLEAN NULL,
    `dob` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uniq_voterId`(`voterId`),
    INDEX `Voter_name_idx`(`name`),
    INDEX `Voter_village_idx`(`village`),
    INDEX `Voter_boothNo_partNo_srn_idx`(`boothNo`, `partNo`, `srn`),
    INDEX `Voter_mobile1_idx`(`mobile1`),
    INDEX `Voter_mobile2_idx`(`mobile2`),
    FULLTEXT INDEX `Voter_name_village_address_boothName_idx`(`name`, `village`, `address`, `boothName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportBatch` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(255) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `rowCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `successCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `failedCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploadedById` BIGINT UNSIGNED NULL,

    INDEX `ImportBatch_status_idx`(`status`),
    INDEX `ImportBatch_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportRow` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `batchId` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('SUCCESS', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'SKIPPED',
    `error` VARCHAR(1024) NULL,
    `raw` TEXT NULL,
    `voterIdStr` VARCHAR(64) NULL,
    `phone1` VARCHAR(20) NULL,
    `voterId` BIGINT UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportRow_batchId_status_idx`(`batchId`, `status`),
    INDEX `ImportRow_voterId_idx`(`voterId`),
    INDEX `ImportRow_voterIdStr_idx`(`voterIdStr`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthSession` ADD CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportBatch` ADD CONSTRAINT `ImportBatch_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportRow` ADD CONSTRAINT `ImportRow_voterId_fkey` FOREIGN KEY (`voterId`) REFERENCES `Voter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportRow` ADD CONSTRAINT `ImportRow_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ImportBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
