-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_feedUrl_key" ON "Source"("feedUrl");

-- CreateIndex
CREATE INDEX "Source_feedUrl_idx" ON "Source"("feedUrl");

-- CreateIndex
CREATE INDEX "Source_domain_idx" ON "Source"("domain");

-- CreateIndex
CREATE INDEX "Source_lastFetchedAt_idx" ON "Source"("lastFetchedAt");

-- CreateIndex
CREATE INDEX "UserSource_userId_idx" ON "UserSource"("userId");

-- CreateIndex
CREATE INDEX "UserSource_sourceId_idx" ON "UserSource"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSource_userId_sourceId_key" ON "UserSource"("userId", "sourceId");

-- AddForeignKey
ALTER TABLE "UserSource" ADD CONSTRAINT "UserSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSource" ADD CONSTRAINT "UserSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
