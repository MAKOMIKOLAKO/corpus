import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify(): Promise<void> {
  console.log('Verifying migration...\n')

  const oldEntryCount = await prisma.entry.count()
  const globalEntryCount = await prisma.globalEntry.count()
  const userEntryCount = await prisma.userEntry.count()
  const userEntryCollectionCount = await prisma.userEntryCollection.count()
  const oldCollectionLinkCount = await prisma.entryCollection.count()

  console.log('=== COUNTS ===')
  console.log(`Old Entry records:            ${oldEntryCount}`)
  console.log(`New GlobalEntry records:      ${globalEntryCount}`)
  console.log(`New UserEntry records:        ${userEntryCount}`)
  console.log(`New UserEntryCollection rows: ${userEntryCollectionCount}`)
  console.log(`Old EntryCollection rows:     ${oldCollectionLinkCount}`)

  // Every old Entry should have a corresponding UserEntry
  if (userEntryCount < oldEntryCount) {
    console.log(`\nWARNING: ${oldEntryCount - userEntryCount} entries did not get UserEntry records.`)
    console.log('Re-run the migration script to fix this.')
  } else {
    console.log('\n✓ All entries have corresponding UserEntry records.')
  }

  // GlobalEntries should be less than or equal to old entries (deduplication)
  if (globalEntryCount <= oldEntryCount) {
    const deduped = oldEntryCount - globalEntryCount
    if (deduped > 0) {
      console.log(`✓ Deduplication removed ${deduped} duplicate entries.`)
    } else {
      console.log('✓ No duplicates found in existing data.')
    }
  }

  // Check for GlobalEntries with no UserEntries (orphans)
  const orphanedGlobals = await prisma.globalEntry.count({
    where: { userEntries: { none: {} } }
  })
  if (orphanedGlobals > 0) {
    console.log(`\nWARNING: ${orphanedGlobals} GlobalEntry records have no UserEntry.`)
  } else {
    console.log('✓ No orphaned GlobalEntry records.')
  }

  // Check saveCount accuracy
  const saveCountMismatch = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT ge.id
    FROM "GlobalEntry" ge
    WHERE ge."saveCount" != (
      SELECT COUNT(*) FROM "UserEntry" ue WHERE ue."globalEntryId" = ge.id
    )
    LIMIT 10
  `
  if (saveCountMismatch.length > 0) {
    console.log(`\nWARNING: ${saveCountMismatch.length} GlobalEntry records have incorrect saveCount.`)
    console.log('Running saveCount fix...')
    await prisma.$executeRaw`
      UPDATE "GlobalEntry" ge
      SET "saveCount" = (
        SELECT COUNT(*) FROM "UserEntry" ue WHERE ue."globalEntryId" = ge.id
      )
    `
    console.log('saveCount fixed.')
  } else {
    console.log('✓ All saveCount values are accurate.')
  }

  // Check for missing UserEntryCollection links
  const missingLinks = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "EntryCollection" ec
    WHERE NOT EXISTS (
      SELECT 1 FROM "UserEntryCollection" uec
      JOIN "UserEntry" ue ON uec."userEntryId" = ue.id
      JOIN "GlobalEntry" ge ON ue."globalEntryId" = ge.id
      WHERE uec."collectionId" = ec."collectionId"
      AND ge.title = (SELECT e.title FROM "Entry" e WHERE e.id = ec."entryId")
    )
  `
  if (Number(missingLinks[0]?.count) > 0) {
    console.log(`\nWARNING: ${Number(missingLinks[0]?.count)} collection links were not migrated.`)
  } else {
    console.log('✓ All collection links migrated successfully.')
  }

  console.log('\nVerification complete.')
  await prisma.$disconnect()
}

verify().catch(async (e) => {
  console.error('Verification error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
