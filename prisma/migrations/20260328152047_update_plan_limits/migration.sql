/*
  Warnings:

  - You are about to drop the column `onboardingCompleted` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReadingStatus" ADD VALUE 'BACKLOG';
ALTER TYPE "ReadingStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "ReadingStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "ReadingStatus" ADD VALUE 'DROPPED';

-- AlterEnum
ALTER TYPE "SignalType" ADD VALUE 'COLLECTION_MEMBER_JOINED';

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "QueueItem" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "onboardingCompleted",
ADD COLUMN     "entriesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "personalCollectionsCount" INTEGER NOT NULL DEFAULT 0;
