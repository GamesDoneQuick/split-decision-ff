-- CreateTable
CREATE TABLE "EventCommitteeMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "EventCommitteeMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCommitteeMember_id_key" ON "EventCommitteeMember"("id");

-- AddForeignKey
ALTER TABLE "EventCommitteeMember" ADD CONSTRAINT "EventCommitteeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCommitteeMember" ADD CONSTRAINT "EventCommitteeMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
