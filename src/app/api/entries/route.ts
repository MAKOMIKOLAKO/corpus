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
        'https://corpus-lemon.vercel.app'
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
                { userKeywords: { hasSome: [search] } },
                { autoKeywords: { hasSome: [search] } },
                // { topics: { hasSome: [search] } }, // TODO: Uncomment after Prisma client regeneration
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
            'https://corpus-lemon.vercel.app'
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
    // Apply rate limiting for write operations
    const rateLimitResponse = rateLimits.api(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        // Get current user and check entry limits
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user data to check plan limits
        const user = await prisma.user.findUnique({
            where: { id: userId },
        }) as any;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Count current entries
        const currentEntryCount = await prisma.entry.count({
            where: { userId }
        });

        // Check if user can add more entries
        if (!canAddEntry(user, currentEntryCount)) {
            return NextResponse.json(
                { error: 'entry_limit_reached', limit: 100 },
                {
                    status: 403,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    }
                }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    }
                }
            );
        }

        const authors = Array.isArray(body.authors)
            ? body.authors
            : typeof body.authors === 'string'
                ? body.authors
                    .split(',')
                    .map((a: string) => a.trim())
                    .filter(Boolean)
                : [];

        const userKeywords = Array.isArray(body.userKeywords)
            ? body.userKeywords
            : typeof body.userKeywords === 'string'
                ? body.userKeywords
                    .split(',')
                    .map((k: string) => k.trim())
                    .filter(Boolean)
                : [];

        // Use the new duplicate handler
        const duplicateCheck = await checkForDuplicates(body.url, body.doi, body.title);

        if (duplicateCheck.isDuplicate) {
            return NextResponse.json(
                {
                    error: 'Duplicate entry detected',
                    duplicateEntry: duplicateCheck.duplicateEntry,
                    confidence: duplicateCheck.confidence,
                    reason: duplicateCheck.reason
                },
                {
                    status: 409,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    }
                }
            );
        }

        // Check if AI generation should be skipped (for bulk entries)
        const skipAI = body.skipAI === true;

        // Generate topics and keywords if abstract or text is provided
        let topics: string[] = [];
        let autoKeywords: string[] = [];
        const textForAnalysis = body.abstract || body.excerpt || '';

        // Only generate AI content if we have substantial text and not skipped
        if (!skipAI && textForAnalysis && textForAnalysis.length > 100 && process.env.GEMINI_API_KEY) {
            try {
                const internalApiKey = request.headers.get('x-api-key') || process.env.KEY || '';
                const internalHeaders: HeadersInit = {
                    'Content-Type': 'application/json',
                    'x-api-key': internalApiKey,
                };
                const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                // Generate topics and keywords in parallel for better performance
                const [topicsResponse, keywordsResponse] = await Promise.all([
                    fetch(`${base}/api/topics`, {
                        method: 'POST',
                        headers: internalHeaders,
                        body: JSON.stringify({ text: textForAnalysis }),
                    }),
                    fetch(`${base}/api/keywords`, {
                        method: 'POST',
                        headers: internalHeaders,
                        body: JSON.stringify({ text: textForAnalysis }),
                    })
                ]);

                // Process responses (avoid .json() on HTML error pages)
                if (topicsResponse.ok) {
                    const ct = topicsResponse.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const topicsData = await topicsResponse.json();
                        topics = topicsData.topics || [];
                    }
                }

                if (keywordsResponse.ok) {
                    const ct = keywordsResponse.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const keywordsData = await keywordsResponse.json();
                        autoKeywords = keywordsData.keywords || [];
                    }
                }
            } catch (error) {
                console.error('Error generating topics/keywords:', error);
                // Continue without topics/keywords if generation fails
            }
        }

        const entryCreateData: any = {
            title: body.title,
            authors,
            year: body.year ? parseInt(body.year, 10) : null,
            contentType: body.contentType || 'PAPER',
            url: body.url || null,
            doi: body.doi || null,
            source: body.source || null,
            abstract: body.abstract || null,
            publishers: Array.isArray(body.publishers) ? body.publishers : [],
            publishDate: body.publishDate || null,
            numberOfPages: typeof body.numberOfPages === 'number' ? body.numberOfPages : null,
            description: body.description || null,
            isbn13: Array.isArray(body.isbn13) ? body.isbn13 : [],
            cover: body.cover || null,
            autoKeywords: autoKeywords, // Use auto-generated keywords
            userKeywords,
            // topics: topics, // TODO: Uncomment after Prisma client regeneration
            summary: body.summary || null,
            notes: body.notes || [],
            readingStatus: body.readingStatus || 'UNREAD',
            userId, // Add userId to associate entry with user
        };

        const entry = await prisma.entry.create({
            data: entryCreateData,
        });

        return NextResponse.json(entry, {
            status: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error creating entry:', error);
        return NextResponse.json({ error: 'Failed to create entry' }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}
