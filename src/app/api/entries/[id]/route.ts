import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import {
  entryNoteAppendSchema,
  entryPatchSchema,
} from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.entry.findUnique({
      where: { id: params.id },
    });
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (entry.userId !== userId) {
      const viaFeed = await prisma.signal.findFirst({
        where: { userId, entryId: entry.id },
      });
      if (!viaFeed) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    }
    return NextResponse.json(entry);
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
    const validation = await validateApiKey(request);
    if (!validation.valid) {
      return validation.response;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.entry.findUnique({ where: { id: params.id } });
    if (!entry || entry.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();

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

      const newNote = {
        text: parsed.data.notes.text,
        createdAt: new Date().toISOString(),
      };

      const existingNotes = Array.isArray(entry.notes) ? entry.notes : [];
      const updatedNotes = [...existingNotes, newNote];

      const updated = await prisma.entry.update({
        where: { id: params.id },
        data: { notes: updatedNotes },
      });
      return NextResponse.json(updated);
    }

    const parsed = entryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const data: Prisma.EntryUpdateInput = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.authors !== undefined) data.authors = d.authors;
    if (d.year !== undefined) data.year = d.year;
    if (d.source !== undefined) data.source = d.source;
    if (d.url !== undefined) data.url = d.url ?? null;
    if (d.doi !== undefined) data.doi = d.doi ?? null;
    if (d.abstract !== undefined) data.abstract = d.abstract ?? null;
    if (d.contentType !== undefined) data.contentType = d.contentType;
    if (d.readingStatus !== undefined) data.readingStatus = d.readingStatus;

    const updated = await prisma.entry.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
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
    const validation = await validateApiKey(request);
    if (!validation.valid) {
      return validation.response;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingEntry = await prisma.entry.findUnique({
      where: { id: params.id },
    });

    if (!existingEntry || existingEntry.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.entry.delete({
      where: { id: params.id },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { entriesCount: { decrement: 1 } }
    });

    return NextResponse.json({
      success: true,
      message: 'Entry deleted successfully',
    });
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
