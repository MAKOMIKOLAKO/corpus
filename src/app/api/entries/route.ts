import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { entryCreateSchema } from '@/lib/validation';
import { canAddEntry } from '@/lib/plans';
import { userEntryWithGlobal, flattenUserEntry, buildSearchWhere } from '@/lib/entryQueries';
import { saveEntryForUser } from '@/lib/globalEntryService';
type ReadingStatus = 'UNREAD' | 'READING' | 'READ' | 'DROPPED';
const CONTENT_TYPE_VALUES = [
  'PAPER',
  'BOOK',
  'ARTICLE',
  'BLOG',
  'ESSAY',
  'POLICY_REPORT',
  'OTHER',
] as const;

function normalizeContentType(value: string | undefined) {
  if (!value) return 'OTHER';
  return CONTENT_TYPE_VALUES.includes(value as (typeof CONTENT_TYPE_VALUES)[number])
    ? (value as (typeof CONTENT_TYPE_VALUES)[number])
    : 'OTHER';
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('search') || searchParams.get('q');
    // Kept for backward compatibility: silently ignored.
    searchParams.get('contentType');
    const readingStatus = searchParams.get('readingStatus');
    const year = searchParams.get('year');
    const collectionId = searchParams.get('collectionId');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const skip = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrder = searchParams.get('sortOrder') ?? 'desc';

    const where = buildSearchWhere(userId, {
      q: q || undefined,
      readingStatus: readingStatus || undefined,
      year: year ? parseInt(year, 10) : undefined,
      collectionId: collectionId || undefined
    });

    // Build orderBy — sort on UserEntry fields or GlobalEntry fields
    let orderBy: any = { createdAt: sortOrder };
    if (sortBy === 'title') {
      orderBy = { globalEntry: { title: sortOrder } };
    } else if (sortBy === 'year') {
      orderBy = { globalEntry: { year: sortOrder } };
    } else if (sortBy === 'saveCount') {
      orderBy = { globalEntry: { saveCount: sortOrder } };
    }

    const [userEntries, total] = await Promise.all([
      prisma.userEntry.findMany({
        where,
        select: userEntryWithGlobal,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.userEntry.count({ where })
    ]);

    return NextResponse.json({
      entries: userEntries.map(flattenUserEntry),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total
    });
  } catch (error) {
    console.error('[api/entries GET]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, entriesCount: true }
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { allowed, reason } = canAddEntry(user.plan, user.entriesCount);
    if (!allowed) {
      return NextResponse.json(
        { error: reason, limit: 50, current: user.entriesCount },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = entryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;

    const result = await saveEntryForUser(
      userId,
      {
        title: d.title,
        authors: d.authors || [],
        year: d.year ?? null,
        abstract: d.abstract ?? null,
        source: d.source || null,
        url: d.url ?? null,
        doi: d.doi ?? null,
        isbn: d.isbn ? [d.isbn] : [],
        metadata: d.metadata !== null && d.metadata !== undefined
          ? (d.metadata as Record<string, any>)
          : null,
        rawContentType: normalizeContentType(d.contentType),
        addedVia: 'manual',
      },
      {
        readingStatus: d.readingStatus ?? 'UNREAD',
        addedVia: 'manual',
      }
    );

    if (result.isDuplicate) {
      // Entry already exists in user's library — return existing
      const existing = await prisma.userEntry.findUnique({
        where: { id: result.userEntryId },
        select: userEntryWithGlobal
      });
      return NextResponse.json(
        {
          ...flattenUserEntry(existing),
          isDuplicate: true,
          message: 'This entry is already in your library'
        },
        { status: 200 }
      );
    }

    // Fetch the created UserEntry for response
    const created = await prisma.userEntry.findUnique({
      where: { id: result.userEntryId },
      select: userEntryWithGlobal
    });

    // Emit activity event (fire and forget)
    prisma.signal.create({
      data: {
        userId,
        type: 'ENTRY_SAVED',
        globalEntryId: result.globalEntryId,
        metadata: {
          title: d.title,
          globalEntryId: result.globalEntryId
        },
        isPublic: false
      }
    }).catch(console.error);

    return NextResponse.json(flattenUserEntry(created), { status: 201 });
  } catch (error) {
    console.error('[api/entries POST]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A record with that value already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
