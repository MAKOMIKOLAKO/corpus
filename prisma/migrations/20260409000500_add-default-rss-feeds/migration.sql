-- CreateTable
CREATE TABLE "DefaultFeed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefaultFeed_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "UserSource"
ADD COLUMN "feedUrl" TEXT,
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "defaultFeedId" TEXT;

-- Backfill feedUrl from existing Source rows to preserve all user subscription data
UPDATE "UserSource" us
SET "feedUrl" = s."feedUrl"
FROM "Source" s
WHERE us."sourceId" = s."id";

-- Enforce required feedUrl after successful backfill
ALTER TABLE "UserSource"
ALTER COLUMN "feedUrl" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DefaultFeed_url_key" ON "DefaultFeed"("url");

-- CreateIndex
CREATE INDEX "DefaultFeed_category_idx" ON "DefaultFeed"("category");

-- CreateIndex
CREATE INDEX "DefaultFeed_isActive_idx" ON "DefaultFeed"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserSource_userId_feedUrl_key" ON "UserSource"("userId", "feedUrl");

-- CreateIndex
CREATE INDEX "UserSource_feedUrl_idx" ON "UserSource"("feedUrl");

-- CreateIndex
CREATE INDEX "UserSource_defaultFeedId_idx" ON "UserSource"("defaultFeedId");

-- AddForeignKey
ALTER TABLE "UserSource" ADD CONSTRAINT "UserSource_defaultFeedId_fkey" FOREIGN KEY ("defaultFeedId") REFERENCES "DefaultFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
