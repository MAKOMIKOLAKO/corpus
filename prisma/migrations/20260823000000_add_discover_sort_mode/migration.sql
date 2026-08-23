-- Add persisted relevance/recency preference for the Discover feed
ALTER TABLE "User" ADD COLUMN "discoverSortMode" TEXT NOT NULL DEFAULT 'relevance';
