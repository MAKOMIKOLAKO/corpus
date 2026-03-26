-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "autoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "userKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
