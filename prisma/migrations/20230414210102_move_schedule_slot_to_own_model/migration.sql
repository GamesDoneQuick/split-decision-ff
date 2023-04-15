/*
  Warnings:

  - You are about to drop the column `nextRunInScheduleId` on the `GameSubmissionCategory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_firstRunId_fkey";

-- DropForeignKey
ALTER TABLE "GameSubmissionCategory" DROP CONSTRAINT "GameSubmissionCategory_nextRunInScheduleId_fkey";

-- DropIndex
DROP INDEX "GameSubmissionCategory_nextRunInScheduleId_key";

-- AlterTable
ALTER TABLE "GameSubmissionCategory" DROP COLUMN "nextRunInScheduleId",
ADD COLUMN     "scheduleSlotId" TEXT;

-- CreateTable
CREATE TABLE "ScheduledRun" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "nextRunId" TEXT,
    "isSleepBlock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledRun_id_key" ON "ScheduledRun"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledRun_categoryId_key" ON "ScheduledRun"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledRun_nextRunId_key" ON "ScheduledRun"("nextRunId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_firstRunId_fkey" FOREIGN KEY ("firstRunId") REFERENCES "ScheduledRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledRun" ADD CONSTRAINT "ScheduledRun_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GameSubmissionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledRun" ADD CONSTRAINT "ScheduledRun_nextRunId_fkey" FOREIGN KEY ("nextRunId") REFERENCES "ScheduledRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
