/*
  Warnings:

  - You are about to drop the column `institutionId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `institutionVerifiedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Institution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InstitutionVerificationCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lab` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LabMember` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Entry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Lab" DROP CONSTRAINT "Lab_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "Lab" DROP CONSTRAINT "Lab_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "LabMember" DROP CONSTRAINT "LabMember_labId_fkey";

-- DropForeignKey
ALTER TABLE "LabMember" DROP CONSTRAINT "LabMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_institutionId_fkey";

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "institutionId",
DROP COLUMN "institutionVerifiedAt";

-- DropTable
DROP TABLE "Institution";

-- DropTable
DROP TABLE "InstitutionVerificationCode";

-- DropTable
DROP TABLE "Lab";

-- DropTable
DROP TABLE "LabMember";

-- DropEnum
DROP TYPE "LabRole";

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "explanation" TEXT,
    "keyConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_slug_key" ON "Entry"("slug");
