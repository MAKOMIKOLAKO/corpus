import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import {
  entryNoteAppendSchema,
  entryPatchSchema,
} from '@/lib/validation';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';
import { removeEntryForUser } from '@/lib/globalEntryService';

const CONTENT_TYPE_VALUES = [
  'PAPER',
  'BOOK',
  'ARTICLE',
  'BLOG',
  'ESSAY',
  'POLICY_REPORT',
  'OTHER',
] as const;

function normalizeContentType(value: string) {
  return CONTENT_TYPE_VALUES.includes(value as (typeof CONTENT_TYPE_VALUES)[number])
    ? (value as (typeof CONTENT_TYPE_VALUES)[number])
    : 'OTHER';
}

function normalizeReadingStatus(value: string) {
  if (value === 'READING') return 'IN_PROGRESS';
  if (value === 'READ') return 'COMPLETED';
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEntry = await prisma.userEntry.findFirst({
      where: { id: params.id, userId },
      select: userEntryWithGlobal
    });

    if (!userEntry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Update lastViewedAt
    prisma.userEntry.update({
      where: { id: params.id },
      data: { lastViewedAt: new Date() }
    }).catch(console.error);

    return NextResponse.json(flattenUserEntry(userEntry));
  } catch (error) {
    console.error('[api/entries/[id] GET]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEntry = await prisma.userEntry.findFirst({
      where: { id: params.id, userId },
      select: { id: true, globalEntryId: true }
    });
    if (!userEntry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();

    // Handle notes append - this is now stored in metadata
    if (
      body?.notes &&
      typeof body.notes === 'object' &&
      'text' in body.notes
    ) {
      const parsed = entryNoteAppendSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      // Get current metadata
      const current = await prisma.globalEntry.findUnique({
        where: { id: userEntry.globalEntryId },
        select: { metadata: true }
      });

      const existingNotes = current?.metadata && Array.isArray((current.metadata as any).notes)
        ? (current.metadata as any).notes
        : [];

      const newNote = {
        text: parsed.data.notes.text,
        createdAt: new Date().toISOString(),
      };

      const updatedNotes = [...existingNotes, newNote];

      // Update metadata on GlobalEntry
      await prisma.globalEntry.update({
        where: { id: userEntry.globalEntryId },
        data: {
          metadata: {
            ...(current?.metadata as any || {}),
            notes: updatedNotes
          }
        }
      });

      const updated = await prisma.userEntry.findUnique({
        where: { id: params.id },
        select: userEntryWithGlobal
      });

      return NextResponse.json(flattenUserEntry(updated));
    }

    const parsed = entryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Only allow updating per-user fields on UserEntry
    const allowedUpdates: Record<string, any> = {};
    if (d.readingStatus !== undefined) {
      const validStatuses = ['UNREAD', 'BACKLOG', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'];
      const normalizedStatus = normalizeReadingStatus(d.readingStatus);
      if (!validStatuses.includes(normalizedStatus)) {
        return NextResponse.json(
          { error: 'Invalid reading status' },
          { status: 400 }
        );
      }
      allowedUpdates.readingStatus = normalizedStatus;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updated = await prisma.userEntry.update({
      where: { id: params.id },
      data: { ...allowedUpdates, updatedAt: new Date() },
      select: userEntryWithGlobal
    });

    return NextResponse.json(flattenUserEntry(updated));
  } catch (error) {
    console.error('[api/entries/[id] PATCH]', error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await removeEntryForUser(userId, params.id);
      return NextResponse.json({
        success: true,
        message: 'Entry deleted successfully',
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('[api/entries/[id] DELETE]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
