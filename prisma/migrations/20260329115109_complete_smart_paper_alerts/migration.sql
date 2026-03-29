/*
  Warnings:

  - The `source` column on the `Entry` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('MANUAL', 'SMART_ALERT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SMART_ALERT', 'CONNECTION_REQUEST', 'SHARED_ENTRY', 'COLLECTION_INVITE');

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "addedByQueryId" TEXT,
DROP COLUMN "source",
ADD COLUMN     "source" "EntrySource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "WatchQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchQuery_userId_idx" ON "WatchQuery"("userId");

-- CreateIndex
CREATE INDEX "WatchQuery_lastCheckedAt_idx" ON "WatchQuery"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "WatchQuery_isActive_lastCheckedAt_idx" ON "WatchQuery"("isActive", "lastCheckedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_addedByQueryId_fkey" FOREIGN KEY ("addedByQueryId") REFERENCES "WatchQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchQuery" ADD CONSTRAINT "WatchQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchQuery" ADD CONSTRAINT "WatchQuery_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
