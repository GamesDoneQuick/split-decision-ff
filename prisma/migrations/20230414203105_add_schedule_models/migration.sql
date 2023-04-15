/*
  Warnings:

  - A unique constraint covering the columns `[nextRunInScheduleId]` on the table `GameSubmissionCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "firstRunId" TEXT;

-- AlterTable
ALTER TABLE "GameSubmissionCategory" ADD COLUMN     "nextRunInScheduleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GameSubmissionCategory_nextRunInScheduleId_key" ON "GameSubmissionCategory"("nextRunInScheduleId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_firstRunId_fkey" FOREIGN KEY ("firstRunId") REFERENCES "GameSubmissionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSubmissionCategory" ADD CONSTRAINT "GameSubmissionCategory_nextRunInScheduleId_fkey" FOREIGN KEY ("nextRunInScheduleId") REFERENCES "GameSubmissionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
