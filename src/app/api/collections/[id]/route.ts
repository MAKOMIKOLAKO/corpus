import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import { canViewCollection } from '@/lib/collectionPermissions';

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userId = await getCurrentUserId();

        const collection = await prisma.collection.findUnique({
            where: { id: params.id },
            include: {
                entries: {
                    include: {
                        entry: {
                            include: {
                                collections: {
                                    include: {
                                        collection: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { addedAt: 'desc' }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    },
                    orderBy: { invitedAt: 'desc' }
                },
                _count: {
                    select: { entries: true, members: true }
                }
            },
        });

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, {
                status: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        if (userId && !canViewCollection(userId, collection)) {
            return NextResponse.json({ error: 'You do not have permission to view this collection' }, {
                status: 403,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        return NextResponse.json(collection, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error fetching collection:', error);
        return NextResponse.json({ error: 'Failed to fetch collection' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const body = await request.json();
        const { name, description } = body;

        const collection = await prisma.collection.update({
            where: { id: params.id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description.trim() || null }),
            },
        });

        return NextResponse.json(collection, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error updating collection:', error);
        return NextResponse.json({ error: 'Failed to update collection' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        await prisma.collection.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Collection deleted successfully' }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error deleting collection:', error);
        return NextResponse.json({ error: 'Failed to delete collection' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
