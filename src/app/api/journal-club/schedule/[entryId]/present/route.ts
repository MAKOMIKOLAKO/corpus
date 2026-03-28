import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canManageJournalClub } from '@/lib/journalClub';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = params;
    const body = await request.json();
    const { collectionId } = body;

    if (!collectionId) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    // Get collection and check permissions
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

    // Check if user can manage journal club OR is the presenter
    const membership = collection.members[0];
    const userPlan = collection.user?.plan || 'FREE';
    
    // Get entry to check if user is presenter
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { metadata: true, title: true }
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entryMeta = entry.metadata as any;
    const isPresenter = entryMeta?.presenterId === userId;
    
    if (!membership || (!canManageJournalClub(userPlan, membership.role) && !isPresenter)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify this is a journal club
    const collectionMeta = collection.metadata as any;
    if (!collectionMeta?.isJournalClub) {
      return NextResponse.json({ error: 'Not a journal club collection' }, { status: 400 });
    }

    // Check if entry belongs to this collection
    const entryCollection = await prisma.entryCollection.findUnique({
      where: {
        entryId_collectionId: {
          entryId,
          collectionId
        }
      }
    });

    if (!entryCollection) {
      return NextResponse.json({ error: 'Entry not found in collection' }, { status: 404 });
    }

    // Check if entry is scheduled
    if (!entryMeta?.presentationDate) {
      return NextResponse.json({ error: 'Entry is not scheduled for presentation' }, { status: 400 });
    }

    // Update entry metadata to mark as presented
    const updatedEntry = await prisma.entry.update({
      where: { id: entryId },
      data: {
        metadata: {
          ...entryMeta,
          presented: true
        }
      }
    });

    // Auto-create JournalClubMeeting record for this date if it doesn't exist
    try {
      const existingMeeting = await prisma.journalClubMeeting.findFirst({
        where: {
          collectionId,
          date: new Date(entryMeta.presentationDate)
        }
      });

      if (!existingMeeting) {
        // Create meeting and pre-populate attendance records
        const meeting = await prisma.journalClubMeeting.create({
          data: {
            collectionId,
            date: new Date(entryMeta.presentationDate)
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
      }
    } catch (meetingError) {
      console.error('Failed to create meeting record:', meetingError);
      // Don't fail the request if meeting creation fails
    }

    // Emit PRESENTATION_MARKED_COMPLETE activity event (fire and forget)
    try {
      await prisma.signal.create({
        data: {
          userId,
          type: 'PRESENTATION_MARKED_COMPLETE',
          entryId,
          collectionId,
          metadata: {
            entryTitle: entry.title,
            collectionName: collection.name,
            presentationDate: entryMeta.presentationDate
          },
          isPublic: false
        }
      });
    } catch (signalError) {
      console.error('Failed to create activity signal:', signalError);
      // Don't fail the request if activity creation fails
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Error marking presentation as complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
