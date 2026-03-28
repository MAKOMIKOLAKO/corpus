/**
 * Queue-based entry creation API
 * Handles multiple input modes with asynchronous processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { entryQueue } from '@/lib/entryQueue';
import prisma from '@/lib/prisma';
import { ContentType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mode, input } = body;

    if (!mode || !input) {
      return NextResponse.json(
        { error: 'Missing required fields: mode and input' },
        { status: 400 }
      );
    }

    if (!['link', 'book', 'paper'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be: link, book, or paper' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // For link mode, validate URL and check for duplicates
    if (mode === 'link') {
      try {
        new URL(input);
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }

      // Check for existing entry with same URL
      const existingEntry = await prisma.entry.findUnique({
        where: { url: input },
      });

      if (existingEntry) {
        return NextResponse.json(
          {
            error: 'Duplicate entry',
            existingEntry,
            confidence: 'high' as const,
            reason: 'An entry with this URL already exists'
          },
          { status: 409 }
        );
      }
    }

    // Add to queue
    const submissionId = entryQueue.enqueue(user.id, mode as any, input);

    // Return immediate response with queue position
    const userQueue = entryQueue.getUserQueue(user.id);
    const queuePosition = userQueue.findIndex(s => s.id === submissionId);

    return NextResponse.json({
      success: true,
      submissionId,
      queuePosition: queuePosition + 1,
      status: 'queued',
    });

  } catch (error) {
    console.error('Entry creation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get queue status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userQueue = entryQueue.getUserQueue(user.id);

    // Cleanup old entries
    entryQueue.cleanup(user.id);

    return NextResponse.json({
      queue: userQueue,
      stats: {
        total: userQueue.length,
        pending: userQueue.filter(s => s.status === 'pending').length,
        processing: userQueue.filter(s => s.status === 'processing').length,
        completed: userQueue.filter(s => s.status === 'completed').length,
        failed: userQueue.filter(s => s.status === 'failed').length,
      }
    });

  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
