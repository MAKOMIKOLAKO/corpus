-- CreateTable
CREATE TABLE "CandidatePaper" (
    "id" TEXT NOT NULL,
    "doi" TEXT,
    "arxivId" TEXT,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "abstract" TEXT,
    "url" TEXT,
    "source" TEXT,
    "publishedDate" TIMESTAMP(3),
    "embedding" JSONB,
    "candidateMetadata" JSONB,
    "plainSummary" TEXT,
    "technicalSummary" TEXT,
    "noveltyTag" TEXT,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embeddedAt" TIMESTAMP(3),

    CONSTRAINT "CandidatePaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserResearchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interestVector" JSONB,
    "domainWeights" JSONB,
    "dismissedPaperIds" TEXT[],
    "preferredDailyCount" INTEGER NOT NULL DEFAULT 5,
    "lastRecomputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserResearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCluster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clusterIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "centroid" JSONB NOT NULL,
    "paperIds" TEXT[],

    CONSTRAINT "DailyCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPaperScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidatePaperId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "semanticScore" DOUBLE PRECISION NOT NULL,
    "domainScore" DOUBLE PRECISION NOT NULL,
    "noveltyScore" DOUBLE PRECISION NOT NULL,
    "citationScore" DOUBLE PRECISION NOT NULL,
    "engagementScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DailyPaperScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "selectedPaperIds" TEXT[],
    "whyExplanations" JSONB NOT NULL,
    "emergingTrendsParagraph" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperReadingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidatePaperId" TEXT,
    "globalEntryId" TEXT,
    "paperText" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "sessionStarted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperReadingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperReadingMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "referencedSections" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperReadingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePaper_doi_key" ON "CandidatePaper"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePaper_arxivId_key" ON "CandidatePaper"("arxivId");

-- CreateIndex
CREATE INDEX "CandidatePaper_publishedDate_embeddedAt_idx" ON "CandidatePaper"("publishedDate", "embeddedAt");

-- CreateIndex
CREATE INDEX "CandidatePaper_doi_idx" ON "CandidatePaper"("doi");

-- CreateIndex
CREATE INDEX "CandidatePaper_ingestedAt_idx" ON "CandidatePaper"("ingestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserResearchProfile_userId_key" ON "UserResearchProfile"("userId");

-- CreateIndex
CREATE INDEX "UserResearchProfile_userId_idx" ON "UserResearchProfile"("userId");

-- CreateIndex
CREATE INDEX "DailyCluster_userId_date_idx" ON "DailyCluster"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCluster_userId_date_clusterIndex_key" ON "DailyCluster"("userId", "date", "clusterIndex");

-- CreateIndex
CREATE INDEX "DailyPaperScore_userId_date_compositeScore_idx" ON "DailyPaperScore"("userId", "date", "compositeScore");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPaperScore_userId_date_candidatePaperId_key" ON "DailyPaperScore"("userId", "date", "candidatePaperId");

-- CreateIndex
CREATE INDEX "DailyBrief_userId_date_idx" ON "DailyBrief"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBrief_userId_date_key" ON "DailyBrief"("userId", "date");

-- CreateIndex
CREATE INDEX "PaperReadingSession_userId_lastActivity_idx" ON "PaperReadingSession"("userId", "lastActivity");

-- CreateIndex
CREATE INDEX "PaperReadingMessage_sessionId_idx" ON "PaperReadingMessage"("sessionId");

-- CreateIndex
CREATE INDEX "PaperReadingMessage_sessionId_createdAt_idx" ON "PaperReadingMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserResearchProfile" ADD CONSTRAINT "UserResearchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCluster" ADD CONSTRAINT "DailyCluster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPaperScore" ADD CONSTRAINT "DailyPaperScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPaperScore" ADD CONSTRAINT "DailyPaperScore_candidatePaperId_fkey" FOREIGN KEY ("candidatePaperId") REFERENCES "CandidatePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyBrief" ADD CONSTRAINT "DailyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperReadingSession" ADD CONSTRAINT "PaperReadingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperReadingSession" ADD CONSTRAINT "PaperReadingSession_candidatePaperId_fkey" FOREIGN KEY ("candidatePaperId") REFERENCES "CandidatePaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperReadingMessage" ADD CONSTRAINT "PaperReadingMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PaperReadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
