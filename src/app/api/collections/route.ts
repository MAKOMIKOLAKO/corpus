import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import { prisma, withRetry } from '@/lib/prismaWithRetry';
import { corsOptionsHeaders } from '@/lib/corsHeaders';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsOptionsHeaders(),
    });
}

export async function GET(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ownedCollections = await prisma.collection.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { entries: true, members: true }
                },
                members: {
                    where: { status: 'ACCEPTED' }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const memberCollections = await prisma.collectionMember.findMany({
            where: {
                userId,
                status: 'ACCEPTED',
            },
            include: {
                collection: {
                    include: {
                        _count: {
                            select: { entries: true, members: true }
                        },
                        members: {
                            where: { status: 'ACCEPTED' }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            owned: ownedCollections,
            member: memberCollections.map(cm => cm.collection)
        });

    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const collection = await withRetry(() =>
            prisma.collection.create({
                data: {
                    name: name.trim(),
                    description: description?.trim() || null,
                    userId,
                },
                include: {
                    _count: {
                        select: { entries: true, members: true }
                    },
                    members: {
                        where: { status: 'ACCEPTED' }
                    }
                }
            })
        );

        return NextResponse.json(collection);
    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
