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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const body = await request.json();
        const { entryId } = body;

        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID is required' }, { 
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        // Check if collection exists
        const collection = await prisma.collection.findUnique({
            where: { id: params.id },
        });

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { 
                status: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        // Check if entry exists
        const entry = await prisma.entry.findUnique({
            where: { id: entryId },
        });

        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { 
                status: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        // Check if entry is already in collection
        const existingEntry = await prisma.entryCollection.findUnique({
            where: {
                entryId_collectionId: {
                    entryId,
                    collectionId: params.id,
                },
            },
        });

        if (existingEntry) {
            return NextResponse.json({ error: 'Entry already in collection' }, { 
                status: 409,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        // Add entry to collection
        const entryCollection = await prisma.entryCollection.create({
            data: {
                entryId,
                collectionId: params.id,
            },
            include: {
                entry: true,
                collection: true,
            },
        });

        return NextResponse.json(entryCollection, {
            status: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error adding entry to collection:', error);
        return NextResponse.json({ error: 'Failed to add entry to collection' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
