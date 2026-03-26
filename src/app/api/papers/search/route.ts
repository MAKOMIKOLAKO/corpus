import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const limit = parseInt(searchParams.get('limit') || '8');

        if (!query || query.length < 3) {
            return NextResponse.json({ results: [] });
        }

        // Search via Semantic Scholar
        try {
            // Build URL with API key if available
            const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
            const params = new URLSearchParams({
                query: query,
                limit: limit.toString(),
                fields: 'paperId,title,authors,year,abstract,venue,externalIds,openAccessPdf'
            });

            // Add API key if available (increases rate limits)
            if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
                params.append('key', process.env.SEMANTIC_SCHOLAR_API_KEY);
            }

            const s2Response = await fetch(`${baseUrl}?${params}`);

            if (!s2Response.ok) {
                // If rate limited or error, return appropriate message
                if (s2Response.status === 429) {
                    console.error('Semantic Scholar rate limit exceeded');
                    return NextResponse.json({
                        results: [],
                        error: 'Search temporarily unavailable due to rate limits. Please try again in a few moments or use DOI lookup.'
                    });
                }

                // Log the actual error for debugging
                const errorText = await s2Response.text();
                console.error('Semantic Scholar API error:', s2Response.status, errorText);

                return NextResponse.json({
                    results: [],
                    error: 'Search temporarily unavailable. Please try entering a DOI instead.'
                });
            }

            const s2Data = await s2Response.json();

            const results = s2Data.data?.map((item: any) => ({
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
