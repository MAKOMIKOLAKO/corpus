import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const limit = parseInt(searchParams.get('limit') || '8');

        if (!query || query.length < 3) {
            return NextResponse.json({ results: [] });
        }

        // Search via Semantic Scholar
        try {
            // Semantic Scholar API URL
            const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';

            // Build URL with parameters
            const params = new URLSearchParams({
                query: query,
                limit: limit.toString(),
                fields: 'paperId,title,authors,year,abstract,venue,externalIds,openAccessPdf'
            });

            // Add API key if available
            if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
                params.append('key', process.env.SEMANTIC_SCHOLAR_API_KEY);
            }

            const response = await fetch(`${baseUrl}?${params}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Semantic Scholar API error:', response.status, errorText);

                // If rate limited
                if (response.status === 429) {
                    return NextResponse.json({
                        results: [],
                        error: 'Search temporarily unavailable due to rate limits. Please try again in a few moments or use DOI lookup.'
                    });
                }

                return NextResponse.json({
                    results: [],
                    error: `Search failed (${response.status}). Please try again or use DOI lookup.`
                });
            }

            const data = await response.json();

            const results = data.data?.map((item: any) => ({
                semanticScholarId: item.paperId,
                title: item.title,
                authors: item.authors?.map((a: any) => a.name) || [],
                year: item.year || null,
                abstract: item.abstract || null,
                source: item.venue || null,
                doi: item.externalIds?.DOI || null,
                openAccessUrl: item.openAccessPdf?.url || null
            })) || [];

            return NextResponse.json({ results });

        } catch (error) {
            console.error('Semantic Scholar search error:', error);
            return NextResponse.json({
                results: [],
                error: 'Search temporarily unavailable. Please try entering a DOI instead.'
            });
        }

    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({
            results: [],
            error: 'Search temporarily unavailable. Please try entering a DOI instead.'
        });
    }
}
