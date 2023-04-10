-- CreateTable
CREATE TABLE "VettingInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twitterAccounts" TEXT NOT NULL,
    "twitchAccount" TEXT NOT NULL,

    CONSTRAINT "VettingInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VettingInfo_id_key" ON "VettingInfo"("id");

-- CreateIndex
CREATE UNIQUE INDEX "VettingInfo_userId_key" ON "VettingInfo"("userId");

-- AddForeignKey
ALTER TABLE "VettingInfo" ADD CONSTRAINT "VettingInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
