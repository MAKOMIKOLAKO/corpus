import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { saveEntryForUser } from '@/lib/globalEntryService';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const { status } = await request.json();
  if (!['ACCEPTED', 'DECLINED'].includes(status)) {
    return NextResponse.json({ error: 'Status must be ACCEPTED or DECLINED' }, { status: 400 });
  }

  const sharedEntry = await prisma.sharedEntry.findUnique({
    where: { id: params.id },
    include: { globalEntry: true },
  });

  if (!sharedEntry) return NextResponse.json({ error: 'Shared entry not found' }, { status: 404 });
  if (sharedEntry.receiverId !== userId) {
    return NextResponse.json({ error: 'Only the receiver can respond' }, { status: 403 });
  }
  if (sharedEntry.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already responded to this shared entry' }, { status: 409 });
  }

  if (status === 'DECLINED') {
    await prisma.sharedEntry.update({
      where: { id: params.id },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  // ACCEPTED: create a UserEntry for the receiver pointing to the same GlobalEntry
  try {
    const result = await saveEntryForUser(
      userId,
      {
        title: sharedEntry.globalEntry!.title,
        authors: sharedEntry.globalEntry!.authors,
        year: sharedEntry.globalEntry!.year,
        abstract: sharedEntry.globalEntry!.abstract,
        source: sharedEntry.globalEntry!.source,
        url: sharedEntry.globalEntry!.url,
        doi: sharedEntry.globalEntry!.doi,
        isbn: sharedEntry.globalEntry!.isbn ? [sharedEntry.globalEntry!.isbn] : [],
        metadata: sharedEntry.globalEntry!.metadata as any,
        rawContentType: sharedEntry.globalEntry!.rawContentType,
      },
      {
        addedVia: 'shared',
        readingStatus: 'UNREAD',
      }
    );

    await prisma.sharedEntry.update({
      where: { id: params.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });

    // Fetch the created UserEntry for response
    const created = await prisma.userEntry.findUnique({
      where: { id: result.userEntryId },
      select: userEntryWithGlobal
    });

    return NextResponse.json({
      success: true,
      entryId: result.userEntryId,
      entry: flattenUserEntry(created)
    });
  } catch (error: any) {
    if (error.message?.includes('already has this entry')) {
      // User already has this entry, just mark as accepted
      await prisma.sharedEntry.update({
        where: { id: params.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });

      // Find existing UserEntry
      const existing = await prisma.userEntry.findFirst({
        where: {
          userId,
          globalEntryId: sharedEntry.globalEntryId!
        },
        select: userEntryWithGlobal
      });

      return NextResponse.json({
        success: true,
        entryId: existing!.id,
        entry: flattenUserEntry(existing!),
        isDuplicate: true
      });
    }
    throw error;
  }
}
