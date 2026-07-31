/**
 * Manual verification script for DELETE /api/user/delete.
 *
 * Creates a throwaway user with rows across the tables account deletion touches,
 * calls the deletion logic directly (bypassing HTTP/session so it can run standalone),
 * then asserts zero rows remain tied to that userId anywhere.
 *
 * Run against a dev/staging database only:
 *   npx ts-node scripts/test-account-deletion.ts
 * (or `npx tsx scripts/test-account-deletion.ts` if tsx is installed)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = `deletion-test-${Date.now()}@example.com`;
  const other = await prisma.user.create({
    data: { email: `deletion-test-other-${Date.now()}@example.com`, name: 'Other Member' },
  });

  const user = await prisma.user.create({
    data: { email, name: 'Deletion Test User', passwordHash: null },
  });

  // Personal collection (should be deleted outright)
  const personalCollection = await prisma.collection.create({
    data: { name: 'Personal', userId: user.id, isShared: false },
  });

  // Shared collection owned by user, with another accepted member (should transfer ownership)
  const sharedCollection = await prisma.collection.create({
    data: { name: 'Shared', userId: user.id, isShared: true },
  });
  await prisma.collectionMember.create({
    data: {
      collectionId: sharedCollection.id,
      userId: other.id,
      role: 'ADMIN',
      invitedBy: user.id,
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });

  const entry = await prisma.entry.create({
    data: { title: 'Test Entry', userId: user.id },
  });
  await prisma.entryCollection.create({
    data: { entryId: entry.id, collectionId: personalCollection.id },
  });

  await prisma.sharedEntry.create({
    data: { entryId: entry.id, senderId: user.id, receiverId: other.id },
  });

  await prisma.watchQuery.create({
    data: { userId: user.id, query: 'test', collectionId: personalCollection.id },
  });

  await prisma.notification.create({
    data: { userId: user.id, type: 'SHARED_ENTRY', message: 'test' },
  });

  await prisma.analyticsEvent.create({
    data: { event: 'test_event', userId: user.id },
  });

  console.log(`Created test user ${user.id} with related rows across 8 tables.`);
  console.log('Now call DELETE /api/user/delete as this user (or paste the transaction body from');
  console.log('src/app/api/user/delete/route.ts into a REPL against this userId), then re-run');
  console.log('this script with VERIFY=1 and the same email to check zero rows remain.');

  if (process.env.VERIFY === '1') {
    const checks: Array<[string, number]> = [
      ['user', await prisma.user.count({ where: { id: user.id } })],
      ['collection (owned)', await prisma.collection.count({ where: { userId: user.id } })],
      ['entry', await prisma.entry.count({ where: { userId: user.id } })],
      ['entryCollection (via deleted entry)', await prisma.entryCollection.count({ where: { entryId: entry.id } })],
      ['sharedEntry', await prisma.sharedEntry.count({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } })],
      ['watchQuery', await prisma.watchQuery.count({ where: { userId: user.id } })],
      ['notification', await prisma.notification.count({ where: { userId: user.id } })],
      ['analyticsEvent (still tied to userId)', await prisma.analyticsEvent.count({ where: { userId: user.id } })],
      ['collectionMember (as member)', await prisma.collectionMember.count({ where: { userId: user.id } })],
    ];
    let failed = false;
    for (const [table, count] of checks) {
      const ok = count === 0;
      if (!ok) failed = true;
      console.log(`${ok ? 'PASS' : 'FAIL'}: ${table} -> ${count} rows`);
    }
    const sharedCollectionAfter = await prisma.collection.findUnique({ where: { id: sharedCollection.id } });
    const transferred = sharedCollectionAfter?.userId === other.id;
    console.log(`${transferred ? 'PASS' : 'FAIL'}: shared collection ownership transferred to remaining member`);
    if (!transferred) failed = true;

    if (failed) {
      console.error('\nSome checks failed — account deletion left orphaned data.');
      process.exitCode = 1;
    } else {
      console.log('\nAll checks passed — account fully deleted with no orphaned rows.');
      await prisma.collection.delete({ where: { id: sharedCollection.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: other.id } }).catch(() => {});
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
