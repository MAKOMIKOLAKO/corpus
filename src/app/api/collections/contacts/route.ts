import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// Returns a deduplicated list of users (id, name, email) the current user shares collections with
// Includes: members of collections the user owns, co-members of collections the user has joined,
// and users the current user has invited to any collection.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // A) Members of collections owned by the user
    const ownedWithMembers = await prisma.collection.findMany({
      where: { userId },
      include: {
        members: {
          where: { status: 'ACCEPTED' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      take: 50,
    });

    // B) Collections where current user is a member; include owner and other members
    const myMemberships = await prisma.collectionMember.findMany({
      where: { userId, status: 'ACCEPTED' },
      include: {
        collection: {
          select: {
            user: { select: { id: true, name: true, email: true } },
            members: {
              where: { status: 'ACCEPTED' },
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
      take: 100,
    });

    // C) Users the current user has invited (any collection, any status)
    const invitedByMe = await prisma.collectionMember.findMany({
      where: { invitedBy: userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      take: 100,
    });

    const byEmail = new Map<string, { id: string; name: string | null; email: string }>();

    // From A
    for (const col of ownedWithMembers) {
      for (const m of col.members) {
        if (m.user?.email && m.user.id !== userId) {
          byEmail.set(m.user.email, { id: m.user.id, name: m.user.name, email: m.user.email });
        }
      }
    }

    // From B - include owner and other members
    for (const mem of myMemberships) {
      const owner = mem.collection.user;
      if (owner?.email && owner.id !== userId) {
        byEmail.set(owner.email, { id: owner.id, name: owner.name, email: owner.email });
      }
      for (const m of mem.collection.members) {
        if (m.user?.email && m.user.id !== userId) {
          byEmail.set(m.user.email, { id: m.user.id, name: m.user.name, email: m.user.email });
        }
      }
    }

    // From C
    for (const inv of invitedByMe) {
      if (inv.user?.email && inv.user.id !== userId) {
        byEmail.set(inv.user.email, { id: inv.user.id, name: inv.user.name, email: inv.user.email });
      }
    }

    const contacts = Array.from(byEmail.values()).slice(0, 50);

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
