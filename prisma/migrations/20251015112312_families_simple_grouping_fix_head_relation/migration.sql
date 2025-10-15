/*
  Warnings:

  - You are about to drop the column `extraCheck1` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `extraCheck2` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `extraInfo1` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `extraInfo2` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `extraInfo3` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `extraInfo4` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `extraInfo5` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `flatNo` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `newAddress` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `personnel` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `society` on the `Voter` table. All the data in the column will be lost.
  - You are about to alter the column `familyId` on the `Voter` table. The data in that column could be lost. The data in that column will be cast from `UnsignedBigInt` to `VarChar(64)`.
  - You are about to drop the `Family` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Family` DROP FOREIGN KEY `Family_headVoterId_fkey`;

-- DropForeignKey
ALTER TABLE `Voter` DROP FOREIGN KEY `Voter_familyId_fkey`;

-- AlterTable
ALTER TABLE `ImportRow` ADD COLUMN `familyIdType` ENUM('JAN_AADHAAR_FAMILY_ID', 'RATION_CARD_NO', 'OTHER') NULL;

-- AlterTable
ALTER TABLE `Voter` DROP COLUMN `extraCheck1`,
    DROP COLUMN `extraCheck2`,
    DROP COLUMN `extraInfo1`,
    DROP COLUMN `extraInfo2`,
    DROP COLUMN `extraInfo3`,
    DROP COLUMN `extraInfo4`,
    DROP COLUMN `extraInfo5`,
    DROP COLUMN `flatNo`,
    DROP COLUMN `newAddress`,
    DROP COLUMN `personnel`,
    DROP COLUMN `society`,
    ADD COLUMN `extraInfo` VARCHAR(512) NULL,
    ADD COLUMN `familyIdType` ENUM('JAN_AADHAAR_FAMILY_ID', 'RATION_CARD_NO', 'OTHER') NULL,
    ADD COLUMN `headId` BIGINT UNSIGNED NULL,
    ADD COLUMN `relationToHead` ENUM('HEAD', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER') NULL,
    MODIFY `familyId` VARCHAR(64) NULL;

-- DropTable
DROP TABLE `Family`;

-- CreateIndex
CREATE INDEX `Voter_headId_idx` ON `Voter`(`headId`);

-- AddForeignKey
ALTER TABLE `Voter` ADD CONSTRAINT `Voter_headId_fkey` FOREIGN KEY (`headId`) REFERENCES `Voter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
