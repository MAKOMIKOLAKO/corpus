const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

function todayUTC() {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function sqlDate(d) {
  return d.toISOString().split('T')[0]
}

async function main() {
  const bucketDate = todayUTC()
  const bucketDateStr = sqlDate(bucketDate)

  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id"
     FROM "CandidatePaper"
     WHERE "embedding" IS NOT NULL
       AND ("source" LIKE 'arXiv:%' OR "source" = 'bioRxiv' OR "source" = 'medRxiv')
     ORDER BY "publishedDate" DESC NULLS LAST, "ingestedAt" DESC
     LIMIT 1000`
  )

  await prisma.$executeRawUnsafe(
    `DELETE FROM "DailyCandidateSetPaper"
     WHERE "dailyCandidateSetId" IN (
       SELECT "id" FROM "DailyCandidateSet" WHERE "date"::date = '${bucketDateStr}'
     )`
  )

  await prisma.$executeRawUnsafe(
    `DELETE FROM "DailyCandidateSet" WHERE "date"::date = '${bucketDateStr}'`
  )

  const created = await prisma.dailyCandidateSet.create({
    data: { date: bucketDate },
  })

  const batchSize = 200
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    await prisma.dailyCandidateSetPaper.createMany({
      data: batch.map((row) => ({
        id: randomUUID(),
        dailyCandidateSetId: created.id,
        candidatePaperId: row.id,
      })),
      skipDuplicates: true,
    })
  }

  const inserted = await prisma.dailyCandidateSetPaper.count({
    where: { dailyCandidateSetId: created.id },
  })

  console.log(JSON.stringify({
    dailyCandidateSetId: created.id,
    date: created.date,
    selectedCandidates: rows.length,
    inserted,
  }, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
