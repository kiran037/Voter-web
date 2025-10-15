/*
  Warnings:

  - You are about to drop the column `headId` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `relationToHead` on the `Voter` table. All the data in the column will be lost.
  - You are about to alter the column `familyId` on the `Voter` table. The data in that column could be lost. The data in that column will be cast from `VarChar(64)` to `UnsignedBigInt`.
  - You are about to drop the `VoterKin` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Voter` DROP FOREIGN KEY `Voter_headId_fkey`;

-- DropForeignKey
ALTER TABLE `VoterKin` DROP FOREIGN KEY `VoterKin_relativeId_fkey`;

-- DropForeignKey
ALTER TABLE `VoterKin` DROP FOREIGN KEY `VoterKin_voterId_fkey`;

-- DropIndex
DROP INDEX `Voter_headId_idx` ON `Voter`;

-- AlterTable
ALTER TABLE `ImportRow` ADD COLUMN `familyExternalId` VARCHAR(64) NULL;

-- AlterTable
ALTER TABLE `Voter` DROP COLUMN `headId`,
    DROP COLUMN `relationToHead`,
    MODIFY `familyId` BIGINT UNSIGNED NULL;

-- DropTable
DROP TABLE `VoterKin`;

-- CreateTable
CREATE TABLE `Family` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(64) NOT NULL,
    `village` VARCHAR(191) NULL,
    `houseNo` VARCHAR(64) NULL,
    `address` VARCHAR(512) NULL,
    `headVoterId` BIGINT UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Family_externalId_key`(`externalId`),
    INDEX `Family_village_idx`(`village`),
    INDEX `Family_houseNo_idx`(`houseNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ImportRow_familyExternalId_idx` ON `ImportRow`(`familyExternalId`);

-- AddForeignKey
ALTER TABLE `Family` ADD CONSTRAINT `Family_headVoterId_fkey` FOREIGN KEY (`headVoterId`) REFERENCES `Voter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Voter` ADD CONSTRAINT `Voter_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
