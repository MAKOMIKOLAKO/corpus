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

        // Search via OpenAlex
        try {
            // Build the URL with correct OpenAlex format
            const baseUrl = 'https://api.openalex.org/works';

            // Start with basic search
            const url = new URL(baseUrl);
            url.searchParams.append('search', query);

            // Add filter for journal articles only
            url.searchParams.append('filter', 'type:journal-article');

            // Add pagination (note: hyphen not underscore)
            url.searchParams.append('per-page', limit.toString());

            // Sort by citation count
            url.searchParams.append('sort', 'cited_by_count:desc');

            // Add API key if available
            if (process.env.OPENALEX_API_KEY) {
                url.searchParams.append('api_key', process.env.OPENALEX_API_KEY);
            }

            const urlString = url.toString();

            const response = await fetch(urlString, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();

                // If we get a 401 or 403, it's likely an API key issue
                if (response.status === 401 || response.status === 403) {
                    return NextResponse.json({
                        results: [],
                        error: 'Search requires an OpenAlex API key. Please add OPENALEX_API_KEY to your environment variables.'
                    });
                }

                // If we get a 400, it's a bad request - show the actual error
                if (response.status === 400) {
                    return NextResponse.json({
                        results: [],
                        error: `Invalid request to OpenAlex: ${errorText}`
                    });
                }

                return NextResponse.json({
                    results: [],
                    error: `Search failed (${response.status}). Please try again or use DOI lookup.`
                });
            }

            const data = await response.json();
            console.log('OpenAlex response data:', JSON.stringify(data, null, 2).substring(0, 1000));

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

            console.log('Processed results count:', results.length);
            if (results.length > 0) {
                console.log('First result:', JSON.stringify(results[0], null, 2));
            }

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
