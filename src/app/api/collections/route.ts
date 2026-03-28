import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import { prisma, withRetry } from '@/lib/prismaWithRetry';
import { corsOptionsHeaders } from '@/lib/corsHeaders';
import { canCreateSharedCollection, canCreatePersonalCollection } from '@/lib/plans';

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

        const body = await request.json();
        const { name, description, isShared } = body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true, personalCollectionsCount: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if creating a shared collection
        if (isShared === true) {
            const { allowed, reason } = canCreateSharedCollection(user.plan);
            if (!allowed) {
                return NextResponse.json({ error: reason }, { status: 403 });
            }
        }

        // Check personal collection limit for non-shared collections
        if (!isShared) {
            const { allowed, reason } = canCreatePersonalCollection(
                user.plan, 
                user.personalCollectionsCount
            );
            if (!allowed) {
                return NextResponse.json(
                    { error: reason, limit: 1, current: user.personalCollectionsCount },
                    { status: 403 }
                );
            }
        }

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const collection = await withRetry(() =>
            prisma.collection.create({
                data: {
                    name: name.trim(),
                    description: description?.trim() || null,
                    isShared: !!isShared,
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

        if (!isShared) {
            await prisma.user.update({
                where: { id: userId },
                data: { personalCollectionsCount: { increment: 1 } }
            });
        }

        return NextResponse.json(collection);
    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
