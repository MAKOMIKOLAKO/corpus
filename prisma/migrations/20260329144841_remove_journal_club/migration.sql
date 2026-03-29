/*
  Warnings:

  - The values [ENTRY_SCHEDULED,PRESENTATION_MARKED_COMPLETE,VOTE_CAST,COMMENT_ADDED] on the enum `SignalType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntryComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JournalClubMeeting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vote` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SignalType_new" AS ENUM ('ENTRY_SAVED', 'ENTRY_ADDED_TO_COLLECTION', 'COLLECTION_MADE_PUBLIC', 'CONNECTION_MADE', 'PAPER_SHARED', 'REFERENCE_REQUESTED', 'COLLECTION_MEMBER_JOINED');
ALTER TABLE "Signal" ALTER COLUMN "type" TYPE "SignalType_new" USING ("type"::text::"SignalType_new");
ALTER TYPE "SignalType" RENAME TO "SignalType_old";
ALTER TYPE "SignalType_new" RENAME TO "SignalType";
DROP TYPE "SignalType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "EntryComment" DROP CONSTRAINT "EntryComment_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "EntryComment" DROP CONSTRAINT "EntryComment_entryId_fkey";

-- DropForeignKey
ALTER TABLE "EntryComment" DROP CONSTRAINT "EntryComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "JournalClubMeeting" DROP CONSTRAINT "JournalClubMeeting_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_entryId_fkey";

-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_userId_fkey";

-- DropTable
DROP TABLE "Attendance";

-- DropTable
DROP TABLE "EntryComment";

-- DropTable
DROP TABLE "JournalClubMeeting";

-- DropTable
DROP TABLE "Vote";

-- DropEnum
DROP TYPE "AttendanceStatus";
