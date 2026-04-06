-- DropIndex
DROP INDEX "AlertContainer_userId_createdAt_idx";

-- DropIndex
DROP INDEX "AlertContainer_userId_watchQueryId_idx";

-- AlterTable
ALTER TABLE "QueueItem" ADD COLUMN     "globalEntryId" TEXT;

-- AlterTable
ALTER TABLE "ReferenceRequest" ADD COLUMN     "globalEntryId" TEXT;

-- AlterTable
ALTER TABLE "SharedEntry" ADD COLUMN     "globalEntryId" TEXT;

-- AlterTable
ALTER TABLE "Signal" ADD COLUMN     "globalEntryId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alertTime" TEXT DEFAULT '09:00';

-- CreateTable
CREATE TABLE "GlobalEntry" (
    "id" TEXT NOT NULL,
    "doi" TEXT,
    "isbn" TEXT,
    "normalizedTitle" TEXT,
    "normalizedFirstAuthor" TEXT,
    "publicationYear" INTEGER,
    "canonicalUrl" TEXT,
    "contentHash" TEXT,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "year" INTEGER,
    "abstract" TEXT,
    "source" TEXT,
    "url" TEXT,
    "rawContentType" TEXT,
    "metadata" JSONB,
    "addedVia" TEXT,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "globalEntryId" TEXT NOT NULL,
    "readingStatus" "ReadingStatus" NOT NULL DEFAULT 'UNREAD',
    "addedVia" TEXT,
    "addedByQueryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "UserEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEntryCollection" (
    "id" TEXT NOT NULL,
    "userEntryId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEntryCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AlertGlobalEntries" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalEntry_doi_key" ON "GlobalEntry"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalEntry_isbn_key" ON "GlobalEntry"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalEntry_canonicalUrl_key" ON "GlobalEntry"("canonicalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalEntry_contentHash_key" ON "GlobalEntry"("contentHash");

-- CreateIndex
CREATE INDEX "GlobalEntry_doi_idx" ON "GlobalEntry"("doi");

-- CreateIndex
CREATE INDEX "GlobalEntry_isbn_idx" ON "GlobalEntry"("isbn");

-- CreateIndex
CREATE INDEX "GlobalEntry_canonicalUrl_idx" ON "GlobalEntry"("canonicalUrl");

-- CreateIndex
CREATE INDEX "GlobalEntry_contentHash_idx" ON "GlobalEntry"("contentHash");

-- CreateIndex
CREATE INDEX "GlobalEntry_normalizedTitle_normalizedFirstAuthor_publicati_idx" ON "GlobalEntry"("normalizedTitle", "normalizedFirstAuthor", "publicationYear");

-- CreateIndex
CREATE INDEX "GlobalEntry_saveCount_idx" ON "GlobalEntry"("saveCount");

-- CreateIndex
CREATE INDEX "UserEntry_userId_idx" ON "UserEntry"("userId");

-- CreateIndex
CREATE INDEX "UserEntry_globalEntryId_idx" ON "UserEntry"("globalEntryId");

-- CreateIndex
CREATE INDEX "UserEntry_userId_readingStatus_idx" ON "UserEntry"("userId", "readingStatus");

-- CreateIndex
CREATE INDEX "UserEntry_userId_createdAt_idx" ON "UserEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserEntry_userId_globalEntryId_key" ON "UserEntry"("userId", "globalEntryId");

-- CreateIndex
CREATE INDEX "UserEntryCollection_collectionId_idx" ON "UserEntryCollection"("collectionId");

-- CreateIndex
CREATE INDEX "UserEntryCollection_userEntryId_idx" ON "UserEntryCollection"("userEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEntryCollection_userEntryId_collectionId_key" ON "UserEntryCollection"("userEntryId", "collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "_AlertGlobalEntries_AB_unique" ON "_AlertGlobalEntries"("A", "B");

-- CreateIndex
CREATE INDEX "_AlertGlobalEntries_B_index" ON "_AlertGlobalEntries"("B");

-- AddForeignKey
ALTER TABLE "SharedEntry" ADD CONSTRAINT "SharedEntry_globalEntryId_fkey" FOREIGN KEY ("globalEntryId") REFERENCES "GlobalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_globalEntryId_fkey" FOREIGN KEY ("globalEntryId") REFERENCES "GlobalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRequest" ADD CONSTRAINT "ReferenceRequest_globalEntryId_fkey" FOREIGN KEY ("globalEntryId") REFERENCES "GlobalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_globalEntryId_fkey" FOREIGN KEY ("globalEntryId") REFERENCES "GlobalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntry" ADD CONSTRAINT "UserEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntry" ADD CONSTRAINT "UserEntry_globalEntryId_fkey" FOREIGN KEY ("globalEntryId") REFERENCES "GlobalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntry" ADD CONSTRAINT "UserEntry_addedByQueryId_fkey" FOREIGN KEY ("addedByQueryId") REFERENCES "WatchQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntryCollection" ADD CONSTRAINT "UserEntryCollection_userEntryId_fkey" FOREIGN KEY ("userEntryId") REFERENCES "UserEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntryCollection" ADD CONSTRAINT "UserEntryCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlertGlobalEntries" ADD CONSTRAINT "_AlertGlobalEntries_A_fkey" FOREIGN KEY ("A") REFERENCES "GlobalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlertGlobalEntries" ADD CONSTRAINT "_AlertGlobalEntries_B_fkey" FOREIGN KEY ("B") REFERENCES "WatchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
