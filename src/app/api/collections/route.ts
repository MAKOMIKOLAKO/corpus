import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import { prisma, withRetry } from '@/lib/prismaWithRetry';

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

export async function GET(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const collections = await prisma.collection.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { entries: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(collections, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Cache for 1 minute, serve stale for 5 minutes
            },
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Failed to fetch collections' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
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

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Collection name is required' }, {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        const collection = await prisma.collection.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
            },
        });

        return NextResponse.json(collection, {
            status: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Failed to create collection' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
