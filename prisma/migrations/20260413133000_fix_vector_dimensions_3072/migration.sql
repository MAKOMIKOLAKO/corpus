-- Migration to fix vector dimension mismatch from 768 to 3072
-- Gemini embedding API returns 3072-dimensional vectors, but schema was set to 768
-- Note: ivfflat indexes have a 2000-dimension limit, so we skip index recreation for now

-- Step 1: Drop existing indexes that depend on the vector columns
DROP INDEX IF EXISTS "CandidatePaper_embedding_idx";
DROP INDEX IF EXISTS "DailyCluster_centroidEmbedding_idx";

-- Step 2: Alter CandidatePaper.embedding from vector(768) to vector(3072)
-- This requires recreating the column since pgvector doesn't support ALTER TYPE for vectors
ALTER TABLE "CandidatePaper" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "CandidatePaper" ADD COLUMN "embedding" vector(3072);

-- Step 3: Alter DailyCluster.centroidEmbedding from vector(768) to vector(3072)
ALTER TABLE "DailyCluster" DROP COLUMN IF EXISTS "centroidEmbedding";
ALTER TABLE "DailyCluster" ADD COLUMN "centroidEmbedding" vector(3072);
