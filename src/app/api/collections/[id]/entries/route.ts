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

        // Create signal for entry added to collection (fire-and-forget)
        try {
            // Use collection owner as signal actor for API-key initiated actions
            const userId = collection.userId;
            if (userId) {
                // Don't await this signal creation
                prisma.signal.create({
                    data: {
                        userId: userId,
                        type: "ENTRY_ADDED_TO_COLLECTION",
                        entryId: entryId,
                        collectionId: params.id,
                        metadata: {
                            entryTitle: entry.title,
                            collectionName: collection.name,
                            collectionIsPublic: collection.isPublic || false
                        }
                    }
                }).catch(err => console.error("Failed to create signal:", err));
            }
        } catch (error) {
            // Fire-and-forget signal creation
            console.error("Failed to create signal:", error);
        }

        return NextResponse.json(entryCollection, {
            status: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error: any) {
        console.error('Error adding entry to collection:', error);

        // Provide detailed error message based on error type
        let errorMessage = 'Failed to add entry to collection';
        let errorDetails = '';

        if (error?.code === 'P2002') {
            // Unique constraint violation
            errorMessage = 'Entry already in collection';
            errorDetails = 'This entry is already a member of the selected collection';
        } else if (error?.code === 'P2025') {
            // Record not found
            errorMessage = 'Entry or collection not found';
            errorDetails = 'The specified entry or collection no longer exists';
        } else if (error?.code === 'P2003') {
            // Foreign key constraint
            errorMessage = 'Invalid entry or collection';
            errorDetails = 'The entry or collection reference is invalid';
        } else if (error?.name === 'PrismaClientKnownRequestError') {
            errorMessage = 'Database error';
            errorDetails = `Database operation failed: ${error.message || 'Unknown database error'}`;
        } else if (error?.name === 'PrismaClientUnknownRequestError') {
            errorMessage = 'Database connection error';
            errorDetails = 'Unable to connect to the database. Please try again later.';
        } else if (error?.name === 'PrismaClientValidationError') {
            errorMessage = 'Invalid data';
            errorDetails = 'The provided data is invalid. Please refresh and try again.';
        } else if (error?.message) {
            errorMessage = error.message;
            errorDetails = 'An unexpected error occurred while adding the entry to the collection.';
        }

        const errorResponse: any = {
            error: errorMessage,
            message: 'Failed to add entry to collection'
        };

        if (errorDetails) {
            errorResponse.details = errorDetails;
        }

        if (process.env.NODE_ENV === 'development') {
            errorResponse.debug = {
                name: error?.name,
                code: error?.code,
                stack: error?.stack
            };
        }

        return NextResponse.json(errorResponse, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
