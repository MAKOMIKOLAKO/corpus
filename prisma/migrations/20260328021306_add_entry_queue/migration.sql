/*
  Warnings:

  - The values [VIDEO,SOCIAL_POST] on the enum `ContentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "QueueItemStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "QueueInputType" AS ENUM ('URL', 'PAPER', 'BOOK');

-- AlterEnum
BEGIN;
CREATE TYPE "ContentType_new" AS ENUM ('PAPER', 'BOOK', 'ARTICLE', 'BLOG', 'ESSAY', 'POLICY_REPORT', 'OTHER');
ALTER TABLE "Entry" ALTER COLUMN "contentType" DROP DEFAULT;
ALTER TABLE "Entry" ALTER COLUMN "contentType" TYPE "ContentType_new" USING ("contentType"::text::"ContentType_new");
ALTER TYPE "ContentType" RENAME TO "ContentType_old";
ALTER TYPE "ContentType_new" RENAME TO "ContentType";
DROP TYPE "ContentType_old";
ALTER TABLE "Entry" ALTER COLUMN "contentType" SET DEFAULT 'PAPER';
COMMIT;

-- CreateTable
CREATE TABLE "QueueItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "QueueItemStatus" NOT NULL DEFAULT 'PENDING',
    "inputType" "QueueInputType" NOT NULL,
    "input" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "entryId" TEXT,
    "errorMessage" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QueueItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
