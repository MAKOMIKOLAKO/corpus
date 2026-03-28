#!/usr/bin/env tsx

/**
 * Migration script to convert journal club datetime fields to date-only format
 * 
 * This script:
 * 1. Converts Collection.metadata.nextMeetingDate from ISO datetime to "YYYY-MM-DD"
 * 2. Converts Entry.metadata.presentationDate from ISO datetime to "YYYY-MM-DD"
 * 3. Removes meetingTime and timezone fields from Collection.metadata
 * 
 * Run with: npx tsx scripts/fix-journal-club-dates.ts
 */

import { prisma } from '../src/lib/prismaWithRetry';

function truncateDateTimeToDate(dateString: string | undefined | null): string | undefined | null {
  if (!dateString) return dateString;

  try {
    // Handle both ISO datetime strings and already-formatted date strings
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateString}`);
      return dateString; // Return original if invalid
    }

    // Return YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`Error processing date: ${dateString}`, error);
    return dateString; // Return original on error
  }
}

async function migrateJournalClubDates() {
  console.log('Starting journal club date migration...');

  try {
    // Migrate collections with journal club metadata
    console.log('Migrating collection metadata...');
    const collections = await prisma.collection.findMany();

    console.log(`Found ${collections.length} total collections to check`);

    for (const collection of collections) {
      const metadata = collection.metadata as any;
      if (!metadata || !metadata.isJournalClub) {
        continue; // Skip non-journal club collections
      }

      let updated = false;
      const newMetadata = { ...metadata };

      // Convert nextMeetingDate from datetime to date-only
      if (metadata.nextMeetingDate) {
        const originalDate = metadata.nextMeetingDate;
        newMetadata.nextMeetingDate = truncateDateTimeToDate(originalDate);
        if (newMetadata.nextMeetingDate !== originalDate) {
          updated = true;
          console.log(`Collection ${collection.id}: nextMeetingDate ${originalDate} -> ${newMetadata.nextMeetingDate}`);
        }
      }

      // Remove meetingTime and timezone fields
      if (metadata.meetingTime !== undefined) {
        delete newMetadata.meetingTime;
        updated = true;
        console.log(`Collection ${collection.id}: removed meetingTime field`);
      }

      if (metadata.timezone !== undefined) {
        delete newMetadata.timezone;
        updated = true;
        console.log(`Collection ${collection.id}: removed timezone field`);
      }

      if (updated) {
        await prisma.collection.update({
          where: { id: collection.id },
          data: {
            metadata: newMetadata as any
          }
        });
        console.log(`✓ Updated collection ${collection.id}`);
      }
    }

    // Migrate entries with presentation dates
    console.log('\nMigrating entry metadata...');
    const entries = await prisma.entry.findMany();

    console.log(`Found ${entries.length} total entries to check`);

    for (const entry of entries) {
      const metadata = entry.metadata as any;
      if (!metadata || !metadata.presentationDate) {
        continue; // Skip entries without presentation dates
      }

      let updated = false;
      const newMetadata = { ...metadata };

      if (metadata.presentationDate) {
        const originalDate = metadata.presentationDate;
        newMetadata.presentationDate = truncateDateTimeToDate(originalDate);
        if (newMetadata.presentationDate !== originalDate) {
          updated = true;
          console.log(`Entry ${entry.id}: presentationDate ${originalDate} -> ${newMetadata.presentationDate}`);
        }
      }

      if (updated) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: {
            metadata: newMetadata as any
          }
        });
        console.log(`✓ Updated entry ${entry.id}`);
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Summary - count journal club collections
    const allCollections = await prisma.collection.findMany();
    const journalClubCount = allCollections.filter(c => {
      const metadata = c.metadata as any;
      return metadata?.isJournalClub === true;
    }).length;

    console.log(`\nSummary: ${journalClubCount} journal club collections in database`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateJournalClubDates()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateJournalClubDates };
