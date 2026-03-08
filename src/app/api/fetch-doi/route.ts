import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { doi } = await request.json();
        if (!doi) {
            return NextResponse.json({ error: 'DOI is required' }, { status: 400 });
        }

        const cleanDoi = doi.trim();
        const response = await fetch(`https://api.crossref.org/works/${cleanDoi}`);

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch DOI metadata from CrossRef' }, { status: response.status });
        }

        const data = await response.json();
        const item = data.message;

        // Parse authors
        const authors = item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || [];

        // Parse year
        const year = item.issued?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || null;

        // Parse source (journal/publisher)
        const source = item['container-title']?.[0] || item.publisher || null;

        // Parse title
        const title = item.title?.[0] || '';

        return NextResponse.json({
            title,
            authors,
            year,
            source,
            abstract: item.abstract || null,
            doi: cleanDoi,
            contentType: 'PAPER',
        });
    } catch (error) {
        console.error('Error fetching DOI:', error);
        return NextResponse.json({ error: 'Internal server error while fetching DOI' }, { status: 500 });
    }
}
