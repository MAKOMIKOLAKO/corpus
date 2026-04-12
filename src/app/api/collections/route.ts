import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma, withRetry } from '@/lib/prismaWithRetry';
import { corsOptionsHeaders } from '@/lib/corsHeaders';
import { canCreateSharedCollection, canCreatePersonalCollection } from '@/lib/plans';
import { timedJson } from '@/lib/serverTiming';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsOptionsHeaders(),
    });
}

export async function GET() {
    const startedAt = Date.now();
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'collections.get');
        }

        const [ownedCollections, memberCollections] = await Promise.all([
            prisma.collection.findMany({
                where: { userId },
                include: {
                    user: {
                        select: {
                            name: true,
                            username: true,
                        }
                    },
                    _count: {
                        select: { entries: true, members: true }
                    },
                    userEntryCollections: {
                        take: 2,
                        orderBy: {
                            addedAt: 'desc',
                        },
                        include: {
                            userEntry: {
                                include: {
                                    globalEntry: {
                                        select: {
                                            id: true,
                                            title: true,
                                        }
                                    }
                                }
                            }
                        }
                    },
                    members: {
                        where: { status: 'ACCEPTED' }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.collectionMember.findMany({
                where: {
                    userId,
                    status: 'ACCEPTED',
                },
                include: {
                    collection: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    username: true,
                                }
                            },
                            _count: {
                                select: { entries: true, members: true }
                            },
                            userEntryCollections: {
                                take: 2,
                                orderBy: {
                                    addedAt: 'desc',
                                },
                                include: {
                                    userEntry: {
                                        include: {
                                            globalEntry: {
                                                select: {
                                                    id: true,
                                                    title: true,
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            members: {
                                where: { status: 'ACCEPTED' }
                            }
                        }
                    }
                }
            })
        ]);

        return timedJson({
            owned: ownedCollections,
            member: memberCollections.map(cm => cm.collection)
        }, startedAt, undefined, 'collections.get');

    } catch (error) {
        console.error('Error fetching collections:', error);
        return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'collections.get');
    }
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'collections.post');
        }

        const body = await request.json();
        const { name, description, isShared } = body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true, personalCollectionsCount: true }
        });

        if (!user) {
            return timedJson({ error: 'User not found' }, startedAt, { status: 404 }, 'collections.post');
        }

        // Check if creating a shared collection
        if (isShared === true) {
            const { allowed, reason } = canCreateSharedCollection(user.plan);
            if (!allowed) {
                return timedJson({ error: reason }, startedAt, { status: 403 }, 'collections.post');
            }
        }

        // Check personal collection limit for non-shared collections
        if (!isShared) {
            const { allowed, reason } = canCreatePersonalCollection(
                user.plan,
                user.personalCollectionsCount
            );
            if (!allowed) {
                return timedJson(
                    { error: reason, limit: 1, current: user.personalCollectionsCount },
                    startedAt,
                    { status: 403 },
                    'collections.post'
                );
            }
        }

        if (!name?.trim()) {
            return timedJson({ error: 'Name is required' }, startedAt, { status: 400 }, 'collections.post');
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

        return timedJson(collection, startedAt, undefined, 'collections.post');
    } catch (error) {
        console.error('Error creating collection:', error);
        return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'collections.post');
    }
}
