import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/app/api/api-key-middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        // First check if the entry exists
        const existingEntry = await prisma.entry.findUnique({
            where: { id: params.id },
        });

        if (!existingEntry) {
            console.log(`Entry not found for deletion: ${params.id}`);
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        console.log(`Attempting to delete entry: ${params.id}`);

        // Delete the entry
        await prisma.entry.delete({
            where: { id: params.id }
        });

        console.log(`Successfully deleted entry: ${params.id}`);
        return NextResponse.json({ success: true, message: 'Entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting entry:', error);
        return NextResponse.json({
            error: 'Failed to delete entry',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
