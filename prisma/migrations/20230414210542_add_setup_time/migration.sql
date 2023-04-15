/*
  Warnings:

  - Added the required column `setupTime` to the `ScheduledRun` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ScheduledRun" ADD COLUMN     "setupTime" TEXT NOT NULL;
