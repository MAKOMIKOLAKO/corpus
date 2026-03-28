import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { checkForDuplicates } from '@/lib/duplicateHandler';
import { getCurrentUserId } from '@/lib/session';
import { prisma, withRetry } from '@/lib/prismaWithRetry';
import { canAddEntry } from '@/lib/plans';
import { rateLimits } from '@/lib/rate-limit';

// Define types to avoid import issues
type ContentType = 'PAPER' | 'BLOG' | 'ESSAY' | 'ARTICLE' | 'POLICY_REPORT' | 'BOOK' | 'OTHER';
type ReadingStatus = 'UNREAD' | 'READING' | 'READ';

export async function OPTIONS(request: NextRequest) {
    const allowedOrigins = [
        'chrome-extension://*',
        process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://usecorpus.app'
    ];
    const origin = request.headers.get('origin');
    const isAllowedOrigin = allowedOrigins.some(allowed =>
        allowed === 'chrome-extension://*' || allowedOrigins.includes(origin || '')
    );
    const allowedOrigin = isAllowedOrigin ? (origin || allowedOrigins[1]) : allowedOrigins[1];

    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin'
        },
    });
}

export async function GET(request: NextRequest) {
    // Apply rate limiting for read operations
    const rateLimitResponse = rateLimits.read(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const contentType = searchParams.get('contentType');
        const readingStatus = searchParams.get('readingStatus');
        const year = searchParams.get('year');

        const where: any = { userId };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { abstract: { contains: search, mode: 'insensitive' } },
                { authors: { hasSome: [search] } },
            ];
        }
        if (contentType) {
            where.contentType = contentType as ContentType;
        }
        if (readingStatus) {
            where.readingStatus = readingStatus as ReadingStatus;
        }
        if (year) {
            where.year = parseInt(year, 10);
        }

        const entries = await prisma.entry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        const allowedOrigins = [
            'chrome-extension://*',
            process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:3001',
            'https://usecorpus.app'
        ];
        const origin = request.headers.get('origin');
        const isAllowedOrigin = allowedOrigins.some(allowed =>
            allowed === 'chrome-extension://*' || allowedOrigins.includes(origin || '')
        );
        const allowedOrigin = isAllowedOrigin ? (origin || allowedOrigins[1]) : allowedOrigins[1];

        return NextResponse.json(entries, {
            headers: {
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Origin': allowedOrigin,
                'Vary': 'Origin'
            }
        });
    } catch (error) {
        console.error('Error fetching entries:', error);
        const allowedOrigins = [
            process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'http://localhost:3001'
        ];
        return NextResponse.json({ error: 'Failed to fetch entries' }, {
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
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user data to check plan limits
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Count current entries
        const currentEntryCount = await prisma.entry.count({
            where: { userId }
        });

        // Check if user can add more entries (limit 100 on free plan)
        if (user.plan === 'FREE' && currentEntryCount >= 100) {
            return NextResponse.json(
                { error: 'entry_limit_reached', limit: 100 },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            title,
            authors,
            year,
            contentType,
            url,
            doi,
            isbn,
            source,
            abstract,
            summary,
            notes,
            readingStatus,
            metadata
        } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const entry = await prisma.entry.create({
            data: {
                title,
                authors: authors || [],
                year: year ? parseInt(year, 10) : null,
                contentType: contentType || 'PAPER',
                url: url || null,
                doi: doi || null,
                isbn13: isbn ? [isbn] : [],
                source: source || null,
                abstract: abstract || null,
                summary: summary || null,
                notes: JSON.stringify(notes || []) as any,
                readingStatus: readingStatus || 'UNREAD',
                userId,
            },
        });

        return NextResponse.json({
            id: entry.id,
            title: entry.title,
            contentType: entry.contentType,
            createdAt: entry.createdAt
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating entry:', error);
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
}
