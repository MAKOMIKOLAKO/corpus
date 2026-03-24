import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlans() {
  try {
    console.log('Seeding plans for existing users...');

    // Update all users who have no plan set or have null plan
    const result = await (prisma as any).user.updateMany({
      where: {
        OR: [
          { plan: null },
          { plan: '' }
        ]
      },
      data: {
        plan: 'FREE'
      }
    });

    console.log(`Updated ${result.count} users to FREE plan`);

    // Count users by plan
    const freeUsers = await (prisma as any).user.count({
      where: { plan: 'FREE' }
    });

    const proUsers = await (prisma as any).user.count({
      where: { plan: 'PRO' }
    });

    const lifetimeProUsers = await (prisma as any).user.count({
      where: { plan: 'LIFETIME_PRO' }
    });

    console.log(`Plan distribution:`);
    console.log(`- FREE: ${freeUsers} users`);
    console.log(`- PRO: ${proUsers} users`);
    console.log(`- LIFETIME_PRO: ${lifetimeProUsers} users`);

  } catch (error) {
    console.error('Error seeding plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPlans()
  .then(() => {
    console.log('Plan seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Plan seeding failed:', error);
    process.exit(1);
  });
