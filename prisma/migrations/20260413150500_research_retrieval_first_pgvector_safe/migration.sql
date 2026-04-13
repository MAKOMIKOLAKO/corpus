CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "CandidatePaper"
  ADD COLUMN IF NOT EXISTS "clusterId" INTEGER,
  ADD COLUMN IF NOT EXISTS "clusterDate" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CandidatePaper'
      AND column_name = 'embedding'
      AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE "CandidatePaper"
      ADD COLUMN IF NOT EXISTS "embedding_new" vector(768);

    UPDATE "CandidatePaper"
    SET "embedding_new" = (
      (
        '[' || array_to_string(ARRAY(SELECT jsonb_array_elements_text("embedding")), ',') || ']'
      )::vector
    )
    WHERE "embedding" IS NOT NULL
      AND jsonb_typeof("embedding") = 'array'
      AND jsonb_array_length("embedding") = 768
      AND "embedding_new" IS NULL;

    ALTER TABLE "CandidatePaper" DROP COLUMN "embedding";
    ALTER TABLE "CandidatePaper" RENAME COLUMN "embedding_new" TO "embedding";
  END IF;
END $$;

DROP INDEX IF EXISTS "CandidatePaper_embedding_idx";
CREATE INDEX IF NOT EXISTS "CandidatePaper_embedding_ivfflat_idx"
  ON "CandidatePaper" USING ivfflat ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "CandidatePaper_clusterDate_clusterId_idx"
  ON "CandidatePaper"("clusterDate", "clusterId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DailyCluster'
      AND column_name = 'userId'
  ) THEN
    ALTER TABLE "DailyCluster" RENAME TO "DailyClusterLegacy_20260413";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DailyCluster" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "clusterId" INTEGER NOT NULL,
  "centroidEmbedding" vector(768) NOT NULL,
  "size" INTEGER NOT NULL,
  CONSTRAINT "DailyCluster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyClusterPaper" (
  "id" TEXT NOT NULL,
  "dailyClusterId" TEXT NOT NULL,
  "candidatePaperId" TEXT NOT NULL,
  CONSTRAINT "DailyClusterPaper_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyCandidateSet" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyCandidateSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyCandidateSetPaper" (
  "id" TEXT NOT NULL,
  "dailyCandidateSetId" TEXT NOT NULL,
  "candidatePaperId" TEXT NOT NULL,
  CONSTRAINT "DailyCandidateSetPaper_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyCluster_date_clusterId_key" ON "DailyCluster"("date", "clusterId");
CREATE INDEX IF NOT EXISTS "DailyCluster_date_idx" ON "DailyCluster"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyClusterPaper_dailyClusterId_candidatePaperId_key"
  ON "DailyClusterPaper"("dailyClusterId", "candidatePaperId");
CREATE INDEX IF NOT EXISTS "DailyClusterPaper_candidatePaperId_idx" ON "DailyClusterPaper"("candidatePaperId");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyCandidateSet_date_key" ON "DailyCandidateSet"("date");
CREATE INDEX IF NOT EXISTS "DailyCandidateSet_date_idx" ON "DailyCandidateSet"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyCandidateSetPaper_dailyCandidateSetId_candidatePaperId_key"
  ON "DailyCandidateSetPaper"("dailyCandidateSetId", "candidatePaperId");
CREATE INDEX IF NOT EXISTS "DailyCandidateSetPaper_candidatePaperId_idx"
  ON "DailyCandidateSetPaper"("candidatePaperId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyClusterPaper_dailyClusterId_fkey'
  ) THEN
    ALTER TABLE "DailyClusterPaper"
      ADD CONSTRAINT "DailyClusterPaper_dailyClusterId_fkey"
      FOREIGN KEY ("dailyClusterId") REFERENCES "DailyCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyClusterPaper_candidatePaperId_fkey'
  ) THEN
    ALTER TABLE "DailyClusterPaper"
      ADD CONSTRAINT "DailyClusterPaper_candidatePaperId_fkey"
      FOREIGN KEY ("candidatePaperId") REFERENCES "CandidatePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyCandidateSetPaper_dailyCandidateSetId_fkey'
  ) THEN
    ALTER TABLE "DailyCandidateSetPaper"
      ADD CONSTRAINT "DailyCandidateSetPaper_dailyCandidateSetId_fkey"
      FOREIGN KEY ("dailyCandidateSetId") REFERENCES "DailyCandidateSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyCandidateSetPaper_candidatePaperId_fkey'
  ) THEN
    ALTER TABLE "DailyCandidateSetPaper"
      ADD CONSTRAINT "DailyCandidateSetPaper_candidatePaperId_fkey"
      FOREIGN KEY ("candidatePaperId") REFERENCES "CandidatePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
