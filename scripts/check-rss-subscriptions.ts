import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== RSS Subscription Check ===\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, plan: true }
  });
  console.log(`Found ${users.length} users\n`);

  for (const user of users) {
    console.log(`--- User: ${user.email} (${user.plan}) ---`);
    
    // Get user's RSS subscriptions
    const userSources = await prisma.userSource.findMany({
      where: { userId: user.id },
      include: {
        source: {
          select: {
            id: true,
            feedUrl: true,
            title: true,
            domain: true,
            lastFetchedAt: true
          }
        },
        defaultFeed: {
          select: {
            id: true,
            name: true,
            url: true,
            category: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Subscribed to ${userSources.length} feeds:`);
    
    for (const us of userSources) {
      const feedName = us.defaultFeed?.name || us.source.title || us.source.domain;
      const isActive = us.defaultFeed?.isActive ?? true;
      const lastFetched = us.source.lastFetchedAt;
      const neverFetched = !lastFetched;
      
      console.log(`  - ${feedName}`);
      console.log(`    URL: ${us.source.feedUrl}`);
      console.log(`    Active: ${isActive}`);
      console.log(`    Last fetched: ${lastFetched?.toISOString() || 'NEVER'}`);
      if (neverFetched) {
        console.log(`    ⚠️  WARNING: This feed has never been fetched!`);
      }
      console.log('');
    }

    // Check if user has any subscriptions to inactive default feeds
    const inactiveSubscriptions = userSources.filter(
      us => us.defaultFeed && !us.defaultFeed.isActive
    );
    
    if (inactiveSubscriptions.length > 0) {
      console.log(`⚠️  ${inactiveSubscriptions.length} subscriptions to INACTIVE default feeds:`);
      for (const us of inactiveSubscriptions) {
        console.log(`  - ${us.defaultFeed?.name} (${us.defaultFeed?.url})`);
      }
      console.log('');
    }

    // Check for feeds that have never been fetched
    const neverFetched = userSources.filter(us => !us.source.lastFetchedAt);
    if (neverFetched.length > 0) {
      console.log(`⚠️  ${neverFetched.length} feeds have NEVER been fetched:`);
      for (const us of neverFetched) {
        console.log(`  - ${us.defaultFeed?.name || us.source.title || us.source.domain}`);
      }
      console.log('');
    }
  }

  // Check all Sources in the database
  console.log('\n=== All Sources in Database ===\n');
  const allSources = await prisma.source.findMany({
    include: {
      userSources: {
        select: { userId: true }
      }
    }
  });
  
  console.log(`Total sources: ${allSources.length}`);
  console.log(`Sources with subscribers: ${allSources.filter(s => s.userSources.length > 0).length}`);
  console.log(`Sources without subscribers: ${allSources.filter(s => s.userSources.length === 0).length}`);
  
  const neverFetchedSources = allSources.filter(s => !s.lastFetchedAt);
  console.log(`Sources never fetched: ${neverFetchedSources.length}`);
  
  if (neverFetchedSources.length > 0) {
    console.log('\nNever fetched sources:');
    for (const source of neverFetchedSources) {
      console.log(`  - ${source.title || source.domain} (${source.feedUrl})`);
      console.log(`    Subscribers: ${source.userSources.length}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
