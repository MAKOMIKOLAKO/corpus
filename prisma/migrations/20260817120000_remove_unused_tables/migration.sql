/*
  Warnings:

  - You are about to drop the `Topic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Connection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReferenceRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyCluster` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyClusterPaper` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyPaperScore` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyMetricsSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyCostSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "ReferenceRequest" DROP CONSTRAINT "ReferenceRequest_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "ReferenceRequest" DROP CONSTRAINT "ReferenceRequest_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "ReferenceRequest" DROP CONSTRAINT "ReferenceRequest_entryId_fkey";

-- DropForeignKey
ALTER TABLE "ReferenceRequest" DROP CONSTRAINT "ReferenceRequest_globalEntryId_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_userId_fkey";

-- DropForeignKey
ALTER TABLE "DailyClusterPaper" DROP CONSTRAINT "DailyClusterPaper_dailyClusterId_fkey";

-- DropForeignKey
ALTER TABLE "DailyClusterPaper" DROP CONSTRAINT "DailyClusterPaper_candidatePaperId_fkey";

-- DropForeignKey
ALTER TABLE "DailyPaperScore" DROP CONSTRAINT "DailyPaperScore_userId_fkey";

-- DropForeignKey
ALTER TABLE "DailyPaperScore" DROP CONSTRAINT "DailyPaperScore_candidatePaperId_fkey";

-- DropTable
DROP TABLE "Topic";

-- DropTable
DROP TABLE "Connection";

-- DropTable
DROP TABLE "ReferenceRequest";

-- DropTable
DROP TABLE "Feedback";

-- DropTable
DROP TABLE "DailyClusterPaper";

-- DropTable
DROP TABLE "DailyCluster";

-- DropTable
DROP TABLE "DailyPaperScore";

-- DropTable
DROP TABLE "DailyMetricsSnapshot";

-- DropTable
DROP TABLE "DailyCostSnapshot";

-- DropEnum
DROP TYPE "ConnectionStatus";

-- DropEnum
DROP TYPE "ReferenceRequestStatus";
