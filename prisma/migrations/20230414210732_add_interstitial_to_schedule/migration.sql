/*
  Warnings:

  - You are about to drop the column `isSleepBlock` on the `ScheduledRun` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScheduledRun" DROP COLUMN "isSleepBlock",
ADD COLUMN     "interstitialName" TEXT,
ADD COLUMN     "isInterstitial" BOOLEAN NOT NULL DEFAULT false;
