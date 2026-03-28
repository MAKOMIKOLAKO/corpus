import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canManageJournalClub } from '@/lib/journalClub';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, userId: targetUserId, status } = body;

    if (!meetingId || !targetUserId || !status) {
      return NextResponse.json({ error: 'Meeting ID, user ID, and status are required' }, { status: 400 });
    }

    // Validate status
    if (!['PRESENT', 'ABSENT', 'EXCUSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check if user is recording their own attendance or is an admin
    if (targetUserId !== userId) {
      // Get meeting and collection info to check admin permissions
      const meeting = await prisma.journalClubMeeting.findUnique({
        where: { id: meetingId },
        include: {
          collection: {
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
          }
        }
      });

      if (!meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }

      // Check if user is admin
      const membership = meeting.collection.members[0];
      const userPlan = meeting.collection.user?.plan || 'FREE';
      if (!membership || !canManageJournalClub(userPlan, membership.role)) {
        return NextResponse.json({ error: 'Insufficient permissions to record others\' attendance' }, { status: 403 });
      }
    }

    // Check if target user is a member of the collection
    const meeting = await prisma.journalClubMeeting.findUnique({
      where: { id: meetingId },
      select: { collectionId: true }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const targetMembership = await prisma.collectionMember.findUnique({
      where: {
        collectionId_userId: {
          collectionId: meeting.collectionId,
          userId: targetUserId
        }
      }
    });

    if (!targetMembership || targetMembership.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Target user is not a member of this collection' }, { status: 400 });
    }

    // Upsert attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        meetingId_userId: {
          meetingId,
          userId: targetUserId
        }
      },
      update: {
        status,
        recordedAt: new Date()
      },
      create: {
        meetingId,
        userId: targetUserId,
        status
      }
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error recording attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
