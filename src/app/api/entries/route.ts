import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { entryCreateSchema } from '@/lib/validation';
import { corsJsonHeaders, corsOptionsHeaders } from '@/lib/corsHeaders';

type ContentType =
  | 'PAPER'
  | 'BLOG'
  | 'ESSAY'
  | 'ARTICLE'
  | 'POLICY_REPORT'
  | 'BOOK'
  | 'OTHER';
type ReadingStatus = 'UNREAD' | 'READING' | 'READ' | 'DROPPED';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsOptionsHeaders(),
  });
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const contentType = searchParams.get('contentType');
    const readingStatus = searchParams.get('readingStatus');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = { userId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { abstract: { contains: search, mode: 'insensitive' } },
        { authors: { hasSome: [search] } },
      ];
    }
    if (contentType) {
      where.contentType = contentType as ContentType;
    }
    if (readingStatus) {
      where.readingStatus = readingStatus as ReadingStatus;
    }
    if (year) {
      where.year = parseInt(year, 10);
    }

    const entries = await prisma.entry.findMany({
      where: where as Prisma.EntryWhereInput,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(entries, {
      headers: corsJsonHeaders(),
    });
  } catch (error) {
    console.error('[api/entries GET]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsJsonHeaders() }
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentEntryCount = await prisma.entry.count({
      where: { userId },
    });

    if (user.plan === 'FREE' && currentEntryCount >= 100) {
      return NextResponse.json(
        { error: 'entry_limit_reached', limit: 100 },
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
    const notesValue = (Array.isArray(d.notes) ? d.notes : []) as Prisma.InputJsonValue;

    const entry = await prisma.entry.create({
      data: {
        title: d.title,
        authors: d.authors,
        year: d.year ?? null,
        contentType: d.contentType,
        url: d.url ?? null,
        doi: d.doi ?? null,
        isbn13: d.isbn ? [d.isbn] : [],
        source: d.source ?? null,
        abstract: d.abstract ?? null,
        summary: d.summary ?? null,
        notes: notesValue,
        metadata:
          d.metadata !== null && d.metadata !== undefined
            ? (d.metadata as Prisma.InputJsonValue)
            : undefined,
        readingStatus: d.readingStatus,
        userId,
      },
    });

    return NextResponse.json(
      {
        id: entry.id,
        title: entry.title,
        contentType: entry.contentType,
        createdAt: entry.createdAt,
      },
      { status: 201 }
    );
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
