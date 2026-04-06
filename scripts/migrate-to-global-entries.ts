import { PrismaClient } from '@prisma/client'
import {
  getDeduplicationKeys,
  findExistingGlobalEntry,
  normalizeDoi
} from '../src/lib/entryDedup.js'

const prisma = new PrismaClient()

interface MigrationStats {
  totalEntries: number
  globalEntriesCreated: number
  globalEntriesReused: number
  userEntriesCreated: number
  userEntriesSkipped: number
  collectionsLinked: number
  errors: string[]
}

async function migrate(): Promise<void> {
  const stats: MigrationStats = {
    totalEntries: 0,
    globalEntriesCreated: 0,
    globalEntriesReused: 0,
    userEntriesCreated: 0,
    userEntriesSkipped: 0,
    collectionsLinked: 0,
    errors: []
  }

  console.log('Starting migration to GlobalEntry + UserEntry system...')
  console.log('This script is idempotent — safe to run multiple times.\n')

  // Fetch all existing entries with their relations
  const entries = await prisma.entry.findMany({
    include: {
      collections: {
        include: {
          collection: { select: { id: true } }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  stats.totalEntries = entries.length
  console.log(`Found ${entries.length} entries to migrate.\n`)

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const progress = `[${i + 1}/${entries.length}]`

    try {
      // Step 1: Compute deduplication keys
      const keys = getDeduplicationKeys({
        doi: entry.doi,
        isbn: (entry.metadata as any)?.isbn ?? null,
        title: entry.title,
        authors: entry.authors,
        year: entry.year,
        url: entry.url
      })

      // Step 2: Check if a GlobalEntry already exists for this content
      let globalEntryId = await findExistingGlobalEntry(prisma, keys)

      if (globalEntryId) {
        // GlobalEntry already exists (from a previous migration run or duplicate)
        stats.globalEntriesReused++
        console.log(`${progress} REUSED GlobalEntry for: "${entry.title.slice(0, 60)}"`)
      } else {
        // Step 3: Create new GlobalEntry
        const globalEntry = await prisma.globalEntry.create({
          data: {
            doi: keys.doi,
            isbn: keys.isbn,
            normalizedTitle: keys.normalizedTitle,
            normalizedFirstAuthor: keys.normalizedFirstAuthor,
            publicationYear: keys.publicationYear,
            canonicalUrl: keys.canonicalUrl,
            contentHash: keys.contentHash,
            title: entry.title,
            authors: entry.authors,
            year: entry.year,
            abstract: entry.abstract,
            source: entry.source,
            url: entry.url,
            rawContentType: entry.contentType,
            metadata: entry.metadata as any,
            addedVia: entry.source === 'SMART_ALERT'
              ? 'SMART_ALERT'
              : 'manual',
            saveCount: 1, // will be incremented if reused
            createdAt: entry.createdAt,
          }
        })
        globalEntryId = globalEntry.id
        stats.globalEntriesCreated++
        console.log(`${progress} CREATED GlobalEntry for: "${entry.title.slice(0, 60)}"`)
      }

      // Step 4: Check if UserEntry already exists (idempotent check)
      const existingUserEntry = await prisma.userEntry.findUnique({
        where: {
          userId_globalEntryId: {
            userId: entry.userId!,
            globalEntryId
          }
        }
      })

      if (existingUserEntry) {
        stats.userEntriesSkipped++
        console.log(`${progress}   SKIPPED UserEntry (already exists)`)
        continue
      }

      // Step 5: Map reading status
      const readingStatusMap: Record<string, string> = {
        'UNREAD': 'UNREAD',
        'BACKLOG': 'BACKLOG',
        'IN_PROGRESS': 'IN_PROGRESS',
        'READING': 'IN_PROGRESS', // map old READING to IN_PROGRESS
        'COMPLETED': 'COMPLETED',
        'READ': 'COMPLETED', // map old READ to COMPLETED
        'DROPPED': 'DROPPED',
      }
      const readingStatus = readingStatusMap[entry.readingStatus] ?? 'UNREAD'

      // Step 6: Create UserEntry
      const userEntry = await prisma.userEntry.create({
        data: {
          userId: entry.userId!,
          globalEntryId,
          readingStatus: readingStatus as any,
          addedVia: entry.source === 'SMART_ALERT'
            ? 'smart_alert'
            : 'manual',
          addedByQueryId: entry.addedByQueryId ?? null,
          createdAt: entry.createdAt,
          updatedAt: entry.createdAt,
        }
      })
      stats.userEntriesCreated++

      // Step 7: Migrate collection memberships to UserEntryCollection
      if (entry.collections && entry.collections.length > 0) {
        for (const ec of entry.collections) {
          try {
            await prisma.userEntryCollection.create({
              data: {
                userEntryId: userEntry.id,
                collectionId: ec.collectionId,
                addedAt: ec.addedAt ?? entry.createdAt,
              }
            })
            stats.collectionsLinked++
          } catch (e: any) {
            // P2002 = unique constraint — already linked, skip
            if (e.code !== 'P2002') {
              stats.errors.push(
                `Failed to link collection ${ec.collectionId} for entry ${entry.id}: ${e.message}`
              )
            }
          }
        }
      }

      // Step 8: Update saveCount on GlobalEntry if it was reused
      if (globalEntryId && stats.globalEntriesReused > 0) {
        await prisma.globalEntry.update({
          where: { id: globalEntryId },
          data: { saveCount: { increment: 1 } }
        })
      }

    } catch (error: any) {
      const message = `Failed to migrate entry ${entry.id} ("${entry.title.slice(0, 40)}"): ${error.message}`
      console.error(`${progress} ERROR: ${message}`)
      stats.errors.push(message)
    }
  }

  // Final report
  console.log('\n=== MIGRATION COMPLETE ===')
  console.log(`Total entries processed:   ${stats.totalEntries}`)
  console.log(`GlobalEntries created:     ${stats.globalEntriesCreated}`)
  console.log(`GlobalEntries reused:      ${stats.globalEntriesReused}`)
  console.log(`UserEntries created:       ${stats.userEntriesCreated}`)
  console.log(`UserEntries skipped:       ${stats.userEntriesSkipped}`)
  console.log(`Collection links created:  ${stats.collectionsLinked}`)
  console.log(`Errors:                    ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\nErrors encountered:')
    stats.errors.forEach(e => console.log(`  - ${e}`))
    console.log('\nRe-run this script to retry failed entries.')
  } else {
    console.log('\nAll entries migrated successfully.')
  }

  await prisma.$disconnect()
}

migrate().catch(async (e) => {
  console.error('Fatal migration error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
