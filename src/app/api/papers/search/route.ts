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

        // Search via OpenAlex (no API key required, higher rate limits)
        try {
            // OpenAlex API URL
            const baseUrl = 'https://api.openalex.org/works';
            const params = new URLSearchParams({
                search: query,
                filter: 'type:journal-article',
                select: 'id,display_name,authorships,publication_year,abstract,primary_location,doi,open_access',
                per_page: limit.toString(),
                sort: 'cited_by_count:desc'
            });

            const response = await fetch(`${baseUrl}?${params}`, {
                headers: {
                    'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)'
                }
            });

            if (!response.ok) {
                return NextResponse.json({
                    results: [],
                    error: `Search failed (${response.status}). Please try again or use DOI lookup.`
                });
            }

            const data = await response.json();

            const results = data.results?.map((item: any) => {
                // Extract authors from authorships
                const authors = item.authorships
                    ?.filter((a: any) => a.author?.display_name)
                    .map((a: any) => a.author.display_name) || [];

                // Extract DOI
                const doi = item.doi || null;

                // Extract open access URL if available
                const openAccessUrl = item.open_access?.oa_url || null;

                // Extract source/journal name
                const source = item.primary_location?.source?.display_name || null;

                return {
                    semanticScholarId: item.id, // Keep as semanticScholarId for compatibility
                    title: item.display_name,
                    authors: authors,
                    year: item.publication_year || null,
                    abstract: item.abstract && item.abstract.startsWith('<Abstract>')
                        ? item.abstract.replace(/<\/?[^>]+(>|$)/g, '').trim() // Remove HTML tags
                        : (item.abstract || null),
                    source: source,
                    doi: doi,
                    openAccessUrl: openAccessUrl
                };
            }) || [];

            return NextResponse.json({ results });

        } catch (error) {
            console.error('OpenAlex search error:', error);
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
