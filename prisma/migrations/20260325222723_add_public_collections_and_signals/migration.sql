/*
  Warnings:

  - A unique constraint covering the columns `[publicSlug]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('ENTRY_SAVED', 'ENTRY_ADDED_TO_COLLECTION', 'COLLECTION_MADE_PUBLIC', 'CONNECTION_MADE', 'PAPER_SHARED', 'REFERENCE_REQUESTED');

-- CreateEnum
CREATE TYPE "LabRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReferenceRequestStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicDescription" TEXT,
ADD COLUMN     "publicSlug" TEXT,
ADD COLUMN     "publicViewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "institutionId" TEXT,
ADD COLUMN     "institutionVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastFeedViewedAt" TIMESTAMP(3),
ADD COLUMN     "showSignals" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "entryId" TEXT,
    "collectionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabMember" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LabRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ReferenceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ReferenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_domain_key" ON "Institution"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_slug_key" ON "Lab"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LabMember_labId_userId_key" ON "LabMember"("labId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceRequest_requesterId_ownerId_entryId_key" ON "ReferenceRequest"("requesterId", "ownerId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_publicSlug_key" ON "Collection"("publicSlug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabMember" ADD CONSTRAINT "LabMember_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabMember" ADD CONSTRAINT "LabMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRequest" ADD CONSTRAINT "ReferenceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRequest" ADD CONSTRAINT "ReferenceRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRequest" ADD CONSTRAINT "ReferenceRequest_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
