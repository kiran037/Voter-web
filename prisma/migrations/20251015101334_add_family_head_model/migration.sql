-- AlterTable
ALTER TABLE `Voter` ADD COLUMN `familyId` VARCHAR(64) NULL,
    ADD COLUMN `headId` BIGINT UNSIGNED NULL,
    ADD COLUMN `relationToHead` ENUM('HEAD', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER') NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX `Voter_familyId_idx` ON `Voter`(`familyId`);

-- CreateIndex
CREATE INDEX `Voter_headId_idx` ON `Voter`(`headId`);

-- AddForeignKey
ALTER TABLE `Voter` ADD CONSTRAINT `Voter_headId_fkey` FOREIGN KEY (`headId`) REFERENCES `Voter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
