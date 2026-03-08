import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const entry = await prisma.entry.findUnique({
            where: { id: params.id },
        });
        if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(entry);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();

        // Handle notes specifically
        if (body.notes && 'text' in body.notes) {
            const entry = await prisma.entry.findUnique({ where: { id: params.id } });
            if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            const newNote = {
                text: body.notes.text,
                createdAt: new Date().toISOString()
            };

            const existingNotes = Array.isArray(entry.notes) ? entry.notes : [];
            const updatedNotes = [...existingNotes, newNote];

            const updated = await prisma.entry.update({
                where: { id: params.id },
                data: { notes: updatedNotes },
            });
            return NextResponse.json(updated);
        }

        // Normal update
        const updated = await prisma.entry.update({
            where: { id: params.id },
            data: body,
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating entry:', error);
        return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        await prisma.entry.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
    }
}
