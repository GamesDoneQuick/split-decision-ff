/*
  Warnings:

  - You are about to drop the column `isCoop` on the `GameSubmission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GameSubmission" DROP COLUMN "isCoop";

-- AlterTable
ALTER TABLE "GameSubmissionCategory" ADD COLUMN     "isCoop" BOOLEAN NOT NULL DEFAULT false;
