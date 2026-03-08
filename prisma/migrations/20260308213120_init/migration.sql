-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PAPER', 'BLOG', 'ESSAY', 'ARTICLE', 'POLICY_REPORT', 'BOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('UNREAD', 'READING', 'READ');

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "year" INTEGER,
    "contentType" "ContentType" NOT NULL DEFAULT 'PAPER',
    "url" TEXT,
    "doi" TEXT,
    "source" TEXT,
    "abstract" TEXT,
    "autoKeywords" TEXT[],
    "userKeywords" TEXT[],
    "summary" TEXT,
    "notes" JSONB NOT NULL DEFAULT '[]',
    "readingStatus" "ReadingStatus" NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);
