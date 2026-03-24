import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/app/api/api-key-middleware';

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; entryId: string } }) {
    try {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        // Find and delete the entry-collection relationship
        const entryCollection = await prisma.entryCollection.delete({
            where: {
                entryId_collectionId: {
                    entryId: params.entryId,
                    collectionId: params.id,
                },
            },
        });

        return NextResponse.json({ message: 'Entry removed from collection successfully' }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error removing entry from collection:', error);
        return NextResponse.json({ error: 'Failed to remove entry from collection' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
