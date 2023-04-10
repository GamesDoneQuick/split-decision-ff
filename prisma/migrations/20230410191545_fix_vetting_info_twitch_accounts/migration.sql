/*
  Warnings:

  - You are about to drop the column `twitchAccount` on the `VettingInfo` table. All the data in the column will be lost.
  - Added the required column `twitchAccounts` to the `VettingInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VettingInfo" DROP COLUMN "twitchAccount",
ADD COLUMN     "twitchAccounts" TEXT NOT NULL;
