import { NextRequest, NextResponse } from 'next/server';
import type { ContentType, ReadingStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prismaWithRetry';
import { getCurrentUserId } from '@/lib/session';
import { triggerQueueProcessing } from '@/lib/queueProcessor';
import { queueItemSchema } from '@/lib/validation';

const READING_STATUSES: ReadingStatus[] = ['UNREAD', 'READING', 'READ', 'DROPPED'];

function normalizeNotes(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = queueItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { inputType, input, payload } = parsed.data;

    const activeCount = await prisma.queueItem.count({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    const position = activeCount + 1;

    if (inputType === 'PAPER' || inputType === 'BOOK') {
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'payload is required for PAPER and BOOK' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const currentEntryCount = await prisma.entry.count({ where: { userId } });
      if (user.plan === 'FREE' && currentEntryCount >= 100) {
        return NextResponse.json(
          { error: 'entry_limit_reached', limit: 100 },
          { status: 403 }
        );
      }

      const p = payload as Record<string, unknown>;
      const readingRaw = p.readingStatus as string | undefined;
      const readingStatus: ReadingStatus =
        readingRaw && READING_STATUSES.includes(readingRaw as ReadingStatus)
          ? (readingRaw as ReadingStatus)
          : 'UNREAD';

      const yearVal = p.year;
      const year =
        yearVal !== null && yearVal !== undefined && yearVal !== ''
          ? parseInt(String(yearVal), 10)
          : null;

      const meta = (p.metadata && typeof p.metadata === 'object' ? p.metadata : {}) as Record<
        string,
        unknown
      >;
      const pagesRaw = meta.pages;
      const numberOfPages =
        pagesRaw !== null && pagesRaw !== undefined && pagesRaw !== ''
          ? parseInt(String(pagesRaw), 10)
          : null;

      try {
        const entry = await prisma.entry.create({
          data: {
            title: String(p.title || ''),
            authors: Array.isArray(p.authors) ? (p.authors as string[]) : [],
            year: year !== null && !Number.isNaN(year) ? year : null,
            contentType: (p.contentType as ContentType) || (inputType === 'PAPER' ? 'PAPER' : 'BOOK'),
            source: (p.source as string) || null,
            abstract: (p.abstract as string) || null,
            description: (p.description as string) || null,
            summary: (p.summary as string) || null,
            doi: (p.doi as string) || null,
            url: (p.url as string) || null,
            isbn13: p.isbn ? [String(p.isbn)] : [],
            numberOfPages: numberOfPages !== null && !Number.isNaN(numberOfPages) ? numberOfPages : null,
            cover: (meta.coverUrl as string) || null,
            readingStatus,
            notes: normalizeNotes(p.notes) as Prisma.InputJsonValue,
            metadata:
              p.metadata && typeof p.metadata === 'object'
                ? (p.metadata as Prisma.InputJsonValue)
                : undefined,
            userId,
          },
        });

        const queueItem = await prisma.queueItem.create({
          data: {
            userId,
            status: 'COMPLETED',
            inputType: inputType as 'PAPER' | 'BOOK',
            input,
            payload: payload as object,
            result: payload as object,
            entryId: entry.id,
            completedAt: new Date(),
            position,
          },
        });

        return NextResponse.json({
          queueItem: {
            id: queueItem.id,
            status: queueItem.status,
            position: queueItem.position,
            inputType: queueItem.inputType,
            input: queueItem.input,
            entryId: entry.id,
          },
        });
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        if (code === 'P2002') {
          return NextResponse.json(
            {
              error: 'ALREADY_EXISTS',
              message: 'This entry is already in your library.',
            },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    if (inputType !== 'URL') {
      return NextResponse.json({ error: 'Invalid inputType' }, { status: 400 });
    }

    const queueItem = await prisma.queueItem.create({
      data: {
        userId,
        status: 'PENDING',
        inputType: 'URL',
        input,
        position,
      },
    });

    triggerQueueProcessing(userId).catch(console.error);

    return NextResponse.json({
      queueItem: {
        id: queueItem.id,
        status: queueItem.status,
        position: queueItem.position,
        inputType: queueItem.inputType,
        input: queueItem.input,
      },
    });
  } catch (error: unknown) {
    console.error('Queue POST error:', error);
    return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.queueItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const processingCount = await prisma.queueItem.count({
      where: { userId, status: 'PROCESSING' },
    });

    const pendingCount = await prisma.queueItem.count({
      where: { userId, status: 'PENDING' },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        inputType: item.inputType,
        input: item.input,
        position: item.position,
        entryId: item.entryId,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
      })),
      processingCount,
      pendingCount,
    });
  } catch (error: unknown) {
    console.error('Queue GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}
