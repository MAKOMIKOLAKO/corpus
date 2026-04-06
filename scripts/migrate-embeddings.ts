import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateEmbeddings(): Promise<void> {
  console.log('Migrating embeddings from Entry to GlobalEntry...')

  // First, check if Entry model has embedding column
  try {
    // Try to query the embedding column
    await prisma.$queryRaw`SELECT embedding FROM "Entry" LIMIT 1`
  } catch (e: any) {
    console.log('No embedding column found in Entry table. Skipping embedding migration.')
    await prisma.$disconnect()
    return
  }

  // Find all old entries that have embeddings
  // Use raw SQL because Prisma cannot read vector columns directly
  const entriesWithEmbeddings = await prisma.$queryRaw<Array<{
    id: string
    doi: string | null
    title: string
    embedding: string
  }>>`
    SELECT id, doi, title, embedding::text 
    FROM "Entry" 
    WHERE embedding IS NOT NULL
  `

  console.log(`Found ${entriesWithEmbeddings.length} entries with embeddings.`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const entry of entriesWithEmbeddings) {
    try {
      // Find the corresponding GlobalEntry
      // Try by DOI first, then by title match
      let globalEntry: { id: string } | null = null

      if (entry.doi) {
        globalEntry = await prisma.globalEntry.findUnique({
          where: { doi: entry.doi.toLowerCase().trim() },
          select: { id: true }
        })
      }

      if (!globalEntry) {
        // Fall back to finding GlobalEntry that was created from this Entry
        // by looking for matching title in GlobalEntry
        const candidates = await prisma.globalEntry.findMany({
          where: { title: entry.title },
          select: { id: true }
        })
        if (candidates.length === 1) {
          globalEntry = candidates[0]
        } else if (candidates.length > 1) {
          // If multiple matches, try to find by DOI
          globalEntry = candidates.find(ge => {
            // We'd need to query the original entry, but for now skip
            return false
          }) ?? null
        }
      }

      if (!globalEntry) {
        console.log(`Could not find GlobalEntry for: "${entry.title.slice(0, 50)}"`)
        skipped++
        continue
      }

      // Check if GlobalEntry already has embedding
      const hasEmbedding = await prisma.$queryRaw<Array<{ has: boolean }>>`
        SELECT embedding IS NOT NULL as has 
        FROM "GlobalEntry" 
        WHERE id = ${globalEntry.id}
      `
      
      if (hasEmbedding[0]?.has) {
        skipped++
        continue
      }

      // Copy embedding to GlobalEntry using raw SQL
      await prisma.$executeRaw`
        UPDATE "GlobalEntry"
        SET embedding = (
          SELECT embedding FROM "Entry" WHERE id = ${entry.id}
        )
        WHERE id = ${globalEntry.id}
      `

      migrated++
      if (migrated % 10 === 0) {
        console.log(`Migrated ${migrated} embeddings...`)
      }
    } catch (error: any) {
      console.error(`Error migrating embedding for entry ${entry.id}:`, error.message)
      errors++
    }
  }

  console.log(`\nEmbedding migration complete.`)
  console.log(`Migrated: ${migrated}`)
  console.log(`Skipped:  ${skipped}`)
  console.log(`Errors:   ${errors}`)

  await prisma.$disconnect()
}

migrateEmbeddings().catch(async (e) => {
  console.error('Fatal error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
