import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canManageJournalClub } from '@/lib/journalClub';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = params;

    // Check if user is a member of the collection
    const membership = await prisma.collectionMember.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId
        }
      }
    });

    if (!membership || membership.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Not a member of this collection' }, { status: 403 });
    }

    // Get all meetings for this collection
    const meetings = await prisma.journalClubMeeting.findMany({
      where: { collectionId },
      include: {
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = params;
    const body = await request.json();
    const { date, notes } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Get collection and check admin permissions
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        members: {
          where: { 
            userId, 
            status: 'ACCEPTED' 
          }
        },
        user: {
          select: { plan: true }
        }
      }
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if user is admin
    const membership = collection.members[0];
    const userPlan = collection.user?.plan || 'FREE';
    if (!membership || !canManageJournalClub(userPlan, membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create meeting
    const meeting = await prisma.journalClubMeeting.create({
      data: {
        collectionId,
        date: new Date(date),
        notes: notes?.trim() || null
      }
    });

    // Get all accepted collection members
    const members = await prisma.collectionMember.findMany({
      where: {
        collectionId,
        status: 'ACCEPTED'
      }
    });

    // Create attendance records for all members (default ABSENT)
    await prisma.attendance.createMany({
      data: members.map(member => ({
        meetingId: meeting.id,
        userId: member.userId,
        status: 'ABSENT'
      }))
    });

    // Return meeting with attendances
    const createdMeeting = await prisma.journalClubMeeting.findUnique({
      where: { id: meeting.id },
      include: {
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(createdMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
