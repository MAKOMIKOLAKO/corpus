-- Drop non-unique index (replaced by unique constraint)
DROP INDEX IF EXISTS "JournalClubMeeting_collectionId_date_idx";

-- CreateUniqueIndex
CREATE UNIQUE INDEX "JournalClubMeeting_collectionId_date_key" ON "JournalClubMeeting"("collectionId", "date");
