-- CreateEnum
CREATE TYPE "AlertEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "WatchQuery" ADD COLUMN     "maxPapers" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "AlertContainer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "watchQueryId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertContainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEntry" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "year" INTEGER,
    "abstract" TEXT,
    "url" TEXT,
    "metadata" JSONB,
    "status" "AlertEntryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertContainer_userId_watchQueryId_idx" ON "AlertContainer"("userId", "watchQueryId");

-- CreateIndex
CREATE INDEX "AlertContainer_userId_createdAt_idx" ON "AlertContainer"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AlertEntry_containerId_status_idx" ON "AlertEntry"("containerId", "status");

-- CreateIndex
CREATE INDEX "AlertEntry_externalId_idx" ON "AlertEntry"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertEntry_containerId_externalId_key" ON "AlertEntry"("containerId", "externalId");

-- AddForeignKey
ALTER TABLE "AlertContainer" ADD CONSTRAINT "AlertContainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertContainer" ADD CONSTRAINT "AlertContainer_watchQueryId_fkey" FOREIGN KEY ("watchQueryId") REFERENCES "WatchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertContainer" ADD CONSTRAINT "AlertContainer_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEntry" ADD CONSTRAINT "AlertEntry_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "AlertContainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
