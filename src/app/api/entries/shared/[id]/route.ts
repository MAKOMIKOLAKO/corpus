import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

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
    include: { entry: true },
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

  // ACCEPTED: copy the entry into receiver's library
  const src = sharedEntry.entry;
  const newEntry = await prisma.entry.create({
    data: {
      title: src.title,
      authors: src.authors,
      year: src.year ?? null,
      contentType: src.contentType,
      // Don't copy url/doi to avoid unique constraint violations
      source: src.source ?? null,
      abstract: src.abstract ?? null,
      publishers: src.publishers,
      publishDate: src.publishDate ?? null,
      numberOfPages: src.numberOfPages ?? null,
      description: src.description ?? null,
      isbn13: src.isbn13,
      cover: src.cover ?? null,
      autoKeywords: src.autoKeywords,
      userKeywords: src.userKeywords,
      topics: src.topics,
      summary: src.summary ?? null,
      notes: src.notes ?? [],
      readingStatus: 'UNREAD',
      userId,
    },
  });

  await prisma.sharedEntry.update({
    where: { id: params.id },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
  });

  return NextResponse.json({ success: true, entryId: newEntry.id });
}
