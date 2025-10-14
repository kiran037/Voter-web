/*
  Warnings:

  - You are about to drop the `AuthSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AuthSession` DROP FOREIGN KEY `AuthSession_userId_fkey`;

-- DropTable
DROP TABLE `AuthSession`;

-- CreateTable
CREATE TABLE `VoterKin` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `voterId` BIGINT UNSIGNED NOT NULL,
    `relativeId` BIGINT UNSIGNED NOT NULL,
    `relation` ENUM('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `notes` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VoterKin_relativeId_idx`(`relativeId`),
    UNIQUE INDEX `VoterKin_voterId_relativeId_relation_key`(`voterId`, `relativeId`, `relation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VoterKin` ADD CONSTRAINT `VoterKin_voterId_fkey` FOREIGN KEY (`voterId`) REFERENCES `Voter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VoterKin` ADD CONSTRAINT `VoterKin_relativeId_fkey` FOREIGN KEY (`relativeId`) REFERENCES `Voter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
