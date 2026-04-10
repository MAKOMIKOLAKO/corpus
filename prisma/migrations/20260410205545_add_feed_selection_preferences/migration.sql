-- AlterTable
ALTER TABLE "UserResearchProfile" ADD COLUMN     "feedSelectionCollectionId" TEXT,
ADD COLUMN     "feedSelectionMode" TEXT NOT NULL DEFAULT 'profile',
ADD COLUMN     "feedSelectionPhrase" TEXT;
