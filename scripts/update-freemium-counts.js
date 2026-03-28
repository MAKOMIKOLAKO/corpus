const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating user counts...');
  
  // Update entriesCount and personalCollectionsCount via SQL
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "User" u SET 
      "entriesCount" = (SELECT COUNT(*) FROM "Entry" e WHERE e."userId" = u.id),
      "personalCollectionsCount" = (
        SELECT COUNT(*) FROM "Collection" c 
        WHERE c."userId" = u.id AND c."isShared" = false
      );
  `);
  
  console.log('Updated counts for', result, 'users.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
