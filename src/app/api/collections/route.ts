import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import { prisma, withRetry } from '@/lib/prismaWithRetry';

export async function OPTIONS(request: NextRequest) {
    const allowedOrigins = [
        process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'http://localhost:3001'
    ];
    const origin = request.headers.get('origin');
    const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];

    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': allowedOrigin || allowedOrigins[0],
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin'
        },
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

        const ownedWithRole = ownedCollections.map(c => ({
            ...c,
            isOwner: true,
            userRole: 'OWNER' as const,
        }));

        const memberWithRole = memberCollections.map(m => ({
            ...m.collection,
            isOwner: false,
            userRole: m.role,
        }));

        const allCollections = [...ownedWithRole, ...memberWithRole];

        const allowedOrigins = [
            process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'http://localhost:3001'
        ];
        const origin = request.headers.get('origin');
        const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];

        return NextResponse.json(allCollections, {
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin || allowedOrigins[0],
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                'Vary': 'Origin'
            },
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        const allowedOrigins = [
            process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'http://localhost:3001'
        ];
        return NextResponse.json({ error: 'Failed to fetch collections' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigins[0],
                'Vary': 'Origin'
            }
        });
    }
}

export async function POST(request: NextRequest) {
    try {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const body = await request.json();
        const { name, description } = body;

        const allowedOrigins = [
            process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'http://localhost:3001'
        ];

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Collection name is required' }, {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': allowedOrigins[0],
                    'Vary': 'Origin'
                }
            });
        }

        // Attach ownership to the authenticated user when available so
        // the collection appears in their list. Fallback to null for
        // API-key only use cases (e.g., browser extension without session).
        const userId = await getCurrentUserId();
        const collection = await prisma.collection.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                ...(userId ? { userId } : {}),
            },
        });

        return NextResponse.json(collection, {
            status: 201,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigins[0],
                'Vary': 'Origin'
            }
        });
    } catch (error) {
        console.error('Error creating collection:', error);
        const allowedOrigins = [
            process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'http://localhost:3001'
        ];
        return NextResponse.json({ error: 'Failed to create collection' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigins[0],
                'Vary': 'Origin'
            }
        });
    }
}
