import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, doi, title } = body;

        if (!url && !doi && !title) {
            return NextResponse.json(
                { error: 'At least one of url, doi, or title must be provided' },
                { status: 400 }
            );
        }

        // Build search criteria
        const searchCriteria = [];

        if (url) {
            searchCriteria.push({ url });
        }

        if (doi) {
            searchCriteria.push({ doi });
        }

        if (title) {
            searchCriteria.push({ title });
        }

        // Find potential duplicates
        const duplicates = await prisma.entry.findMany({
            where: {
                OR: searchCriteria
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10 // Limit to 10 most recent potential duplicates
        });

        if (duplicates.length === 0) {
            return NextResponse.json({
                found: false,
                message: 'No duplicates found'
            });
        }

        // Calculate similarity scores and categorize duplicates
        const categorizedDuplicates = {
            exactMatches: [] as any[],
            possibleMatches: [] as any[],
            similarTitles: [] as any[]
        };

        duplicates.forEach(entry => {
            let matchType = 'possible';

            if (url && entry.url === url) {
                matchType = 'exact';
            } else if (doi && entry.doi === doi) {
                matchType = 'exact';
            } else if (title && entry.title.toLowerCase() === title.toLowerCase()) {
                matchType = 'exact';
            } else if (title && entry.title.toLowerCase().includes(title.toLowerCase()) ||
                title.toLowerCase().includes(entry.title.toLowerCase())) {
                matchType = 'similar';
            }

            const duplicateEntry = {
                ...entry,
                matchType,
                matchReason: getMatchReason(entry, { url, doi, title })
            };

            if (matchType === 'exact') {
                categorizedDuplicates.exactMatches.push(duplicateEntry);
            } else if (matchType === 'similar') {
                categorizedDuplicates.similarTitles.push(duplicateEntry);
            } else {
                categorizedDuplicates.possibleMatches.push(duplicateEntry);
            }
        });

        return NextResponse.json({
            found: true,
            duplicates: categorizedDuplicates,
            summary: {
                total: duplicates.length,
                exactMatches: categorizedDuplicates.exactMatches.length,
                possibleMatches: categorizedDuplicates.possibleMatches.length,
                similarTitles: categorizedDuplicates.similarTitles.length
            }
        });

    } catch (error: any) {
        console.error('Error checking duplicates:', error);
        return NextResponse.json(
            { error: 'Failed to check for duplicates' },
            { status: 500 }
        );
    }
}

function getMatchReason(entry: any, searchParams: { url?: string, doi?: string, title?: string }): string {
    const reasons = [];

    if (searchParams.url && entry.url === searchParams.url) {
        reasons.push('URL match');
    }

    if (searchParams.doi && entry.doi === searchParams.doi) {
        reasons.push('DOI match');
    }

    if (searchParams.title) {
        if (entry.title.toLowerCase() === searchParams.title.toLowerCase()) {
            reasons.push('Exact title match');
        } else if (entry.title.toLowerCase().includes(searchParams.title.toLowerCase()) ||
            searchParams.title.toLowerCase().includes(entry.title.toLowerCase())) {
            reasons.push('Similar title');
        }
    }

    return reasons.join(', ') || 'Possible match';
}
