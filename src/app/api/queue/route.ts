import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import { getCurrentUserId } from '@/lib/session';
import { triggerQueueProcessing } from '@/lib/queueProcessor';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { inputType, input, payload } = body;

    if (!inputType || !input) {
      return NextResponse.json({ error: 'Missing inputType or input' }, { status: 400 });
    }

    // 1. Get current queue count (PENDING or PROCESSING)
    const activeCount = await prisma.queueItem.count({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    const position = activeCount + 1;

    // 4. If PAPER or BOOK create entry immediately
    if (inputType === 'PAPER' || inputType === 'BOOK') {
      try {
        const entryData: any = {
          title: payload.title,
          authors: payload.authors || [],
          year: payload.year ? parseInt(payload.year) : null,
          contentType: payload.contentType || (inputType === 'PAPER' ? 'PAPER' : 'BOOK'),
          source: payload.source || null,
          abstract: payload.abstract || null,
          doi: payload.doi || null,
          url: payload.url || null,
          isbn13: payload.isbn ? [payload.isbn] : [],
          numberOfPages: payload.metadata?.pages ? parseInt(payload.metadata.pages) : null,
          cover: payload.metadata?.coverUrl || null,
          readingStatus: payload.readingStatus || 'UNREAD',
          userId,
          notes: payload.notes || []
        };

        const entry = await prisma.entry.create({
          data: entryData
        });

        const queueItem = await prisma.queueItem.create({
          data: {
            userId,
            status: 'COMPLETED',
            inputType: inputType as any,
            input,
            payload: payload as any,
            result: payload as any,
            entryId: entry.id,
            completedAt: new Date(),
            position
          }
        });

        return NextResponse.json({ queueItem });
      } catch (err: any) {
        // Handle duplicate DOI or URL
        if (err.code === 'P2002') {
          return NextResponse.json({ 
            error: 'ALREADY_EXISTS',
            message: 'This entry is already in your library.' 
          }, { status: 409 });
        }
        throw err; // Re-throw for general catch
      }
    }

    // 5. If URL, create PENDING and trigger processing
    const queueItem = await prisma.queueItem.create({
      data: {
        userId,
        status: 'PENDING',
        inputType: 'URL',
        input,
        position
      }
    });

    // Trigger processing asynchronously
    triggerQueueProcessing(userId).catch(console.error);

    return NextResponse.json({ queueItem: { 
      id: queueItem.id, 
      status: queueItem.status, 
      position: queueItem.position, 
      inputType: queueItem.inputType, 
      input: queueItem.input 
    }});

  } catch (error: any) {
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
      orderBy: { createdAt: 'desc' }
    });

    const processingCount = await prisma.queueItem.count({
      where: { userId, status: 'PROCESSING' }
    });

    const pendingCount = await prisma.queueItem.count({
      where: { userId, status: 'PENDING' }
    });

    return NextResponse.json({
      items: items.map(item => ({
        id: item.id,
        status: item.status,
        inputType: item.inputType,
        input: item.input,
        position: item.position,
        entryId: item.entryId,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt
      })),
      processingCount,
      pendingCount
    });

  } catch (error: any) {
    console.error('Queue GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}
