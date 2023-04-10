-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "maxIncentives" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "RunIncentive" (
    "id" TEXT NOT NULL,
    "gameSubmissionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "videoURL" TEXT NOT NULL,
    "estimate" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "runStatus" "RunStatus" NOT NULL DEFAULT 'Pending',

    CONSTRAINT "RunIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentivesOnCategories" (
    "categoryId" TEXT NOT NULL,
    "incentiveId" TEXT NOT NULL,

    CONSTRAINT "IncentivesOnCategories_pkey" PRIMARY KEY ("incentiveId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RunIncentive_id_key" ON "RunIncentive"("id");

-- AddForeignKey
ALTER TABLE "RunIncentive" ADD CONSTRAINT "RunIncentive_gameSubmissionId_fkey" FOREIGN KEY ("gameSubmissionId") REFERENCES "GameSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivesOnCategories" ADD CONSTRAINT "IncentivesOnCategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GameSubmissionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivesOnCategories" ADD CONSTRAINT "IncentivesOnCategories_incentiveId_fkey" FOREIGN KEY ("incentiveId") REFERENCES "RunIncentive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
