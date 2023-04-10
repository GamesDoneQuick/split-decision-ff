/*
  Warnings:

  - Made the column `incentiveSubmissionPeriodEnd` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable

UPDATE "Event" SET "incentiveSubmissionPeriodEnd"=COALESCE("gameSubmissionPeriodEnd", now());

ALTER TABLE "Event" ALTER COLUMN "incentiveSubmissionPeriodEnd" SET NOT NULL;
