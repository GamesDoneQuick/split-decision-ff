/*
  Warnings:

  - The values [Accpeted] on the enum `RunStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RunStatus_new" AS ENUM ('Accepted', 'Rejected', 'Backup', 'Bonus', 'Pending');
ALTER TABLE "GameSubmissionCategory" ALTER COLUMN "runStatus" DROP DEFAULT;
ALTER TABLE "GameSubmissionCategory" ALTER COLUMN "runStatus" TYPE "RunStatus_new" USING ("runStatus"::text::"RunStatus_new");
ALTER TYPE "RunStatus" RENAME TO "RunStatus_old";
ALTER TYPE "RunStatus_new" RENAME TO "RunStatus";
DROP TYPE "RunStatus_old";
ALTER TABLE "GameSubmissionCategory" ALTER COLUMN "runStatus" SET DEFAULT 'Pending';
COMMIT;
