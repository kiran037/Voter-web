-- DropIndex
DROP INDEX `Voter_name_village_address_boothName_idx` ON `Voter`;

-- AlterTable
ALTER TABLE `ImportBatch` ADD COLUMN `maxRowsAllowed` INTEGER UNSIGNED NOT NULL DEFAULT 1500;

-- AlterTable
ALTER TABLE `ImportRow` ADD COLUMN `fatherNameStr` VARCHAR(191) NULL,
    ADD COLUMN `partySupportStr` VARCHAR(64) NULL,
    ADD COLUMN `wardNoStr` VARCHAR(32) NULL;

-- AlterTable
ALTER TABLE `Voter` ADD COLUMN `fatherName` VARCHAR(191) NULL,
    ADD COLUMN `partySupport` VARCHAR(64) NULL,
    ADD COLUMN `wardNo` INTEGER UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `Voter_wardNo_idx` ON `Voter`(`wardNo`);

-- CreateIndex
CREATE INDEX `Voter_partySupport_idx` ON `Voter`(`partySupport`);

-- CreateIndex
CREATE FULLTEXT INDEX `Voter_name_village_address_boothName_fatherName_idx` ON `Voter`(`name`, `village`, `address`, `boothName`, `fatherName`);
