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

        // Create signal for entry saved (fire-and-forget)
        try {
            // Don't await this signal creation
            prisma.signal.create({
                data: {
                    userId: userId,
                    type: "ENTRY_SAVED",
                    entryId: entry.id,
                    metadata: {
                        title: entry.title,
                        contentType: entry.contentType,
                        topics: entry.topics || []
                    }
                }
            }).catch(err => console.error("Failed to create signal:", err));
        } catch (error) {
            // Fire-and-forget signal creation
            console.error("Failed to create signal:", error);
        }

        return NextResponse.json(entry, {
            status: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error: any) {
        console.error('Error creating entry:', error);

        // Provide detailed error message based on error type
        let errorMessage = 'Failed to create entry';
        let errorDetails = '';

        if (error?.code === 'P2002') {
            // Unique constraint violation
            const field = error?.meta?.target?.[0] || 'unknown field';
            errorMessage = `Entry already exists`;
            errorDetails = `An entry with this ${field} already exists in your library`;
        } else if (error?.code === 'P2025') {
            // Record not found
            errorMessage = 'Referenced data not found';
            errorDetails = 'The entry references data that no longer exists';
        } else if (error?.code === 'P2003') {
            // Foreign key constraint
            errorMessage = 'Invalid reference';
            errorDetails = 'The entry contains invalid reference data';
        } else if (error?.name === 'PrismaClientKnownRequestError') {
            errorMessage = 'Database error';
            errorDetails = `Database operation failed: ${error.message || 'Unknown database error'}`;
        } else if (error?.name === 'PrismaClientUnknownRequestError') {
            errorMessage = 'Database connection error';
            errorDetails = 'Unable to connect to the database. Please try again later.';
        } else if (error?.name === 'PrismaClientRustPanicError') {
            errorMessage = 'Database system error';
            errorDetails = 'The database encountered an unexpected error. Please try again.';
        } else if (error?.name === 'PrismaClientInitializationError') {
            errorMessage = 'Database initialization failed';
            errorDetails = 'Failed to initialize database connection. Please refresh and try again.';
        } else if (error?.name === 'PrismaClientValidationError') {
            errorMessage = 'Invalid entry data';
            errorDetails = 'The entry data is invalid or incomplete. Please check all fields.';
        } else if (error?.message) {
            errorMessage = error.message;
            errorDetails = 'An unexpected error occurred while saving the entry.';
        }

        const errorResponse: any = {
            error: errorMessage,
            message: 'Failed to save entry to your library'
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
