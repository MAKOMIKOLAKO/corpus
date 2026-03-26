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
            const s2Response = await fetch(
                `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=paperId,title,authors,year,abstract,venue,externalIds,openAccessPdf`
            );

            if (!s2Response.ok) {
                // If rate limited or error, return empty results
                if (s2Response.status === 429) {
                    return NextResponse.json({ results: [], error: 'Search unavailable' });
                }
                return NextResponse.json({ results: [] });
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
            return NextResponse.json({ results: [], error: 'Search unavailable' });
        }

    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ results: [], error: 'Search unavailable' });
    }
}
