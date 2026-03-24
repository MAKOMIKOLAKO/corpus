const { PrismaClient } = require("@prisma/client");

try {
  require("dotenv").config();
} catch {
  // If dotenv isn't installed, the script can still run if env vars are set by the shell.
}

async function main() {
  const ownerEmail = process.env.ALLOWED_GOOGLE_EMAIL;
  if (!ownerEmail) {
    throw new Error("ALLOWED_GOOGLE_EMAIL is not set");
  }

  const prisma = new PrismaClient();

  try {
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: { email: ownerEmail },
      select: { id: true, email: true },
    });

    const entryResult = await prisma.entry.updateMany({
      where: { userId: null },
      data: { userId: owner.id },
    });

    const collectionResult = await prisma.collection.updateMany({
      where: { userId: null },
      data: { userId: owner.id },
    });

    console.log("Owner user:", owner);
    console.log("Entries assigned:", entryResult.count);
    console.log("Collections assigned:", collectionResult.count);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
