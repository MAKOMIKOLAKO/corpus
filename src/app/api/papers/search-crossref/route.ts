import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';

export async function GET(request: NextRequest) {
    try {
        // Validate API key
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }
        
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        
        if (!query) {
            return NextResponse.json(
                { error: 'Query parameter is required' },
                { status: 400 }
            );
        }
        
        // Call CrossRef API
        const response = await fetch(
            `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5&select=DOI,title,author,published,container-title,abstract`,
            {
                headers: {
                    'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)'
                }
            }
        );
        
        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to search CrossRef' },
                { status: 502 }
            );
        }
        
        const data = await response.json();
        const items = data.message?.items || [];
        
        const candidates = items.map((item: any) => ({
            doi: item.DOI,
            title: item.title?.[0] || 'Untitled',
            authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean) || [],
            year: item.published?.['date-parts']?.[0]?.[0] || null,
            source: item['container-title']?.[0] || null
        }));
        
        return NextResponse.json({ candidates });
        
    } catch (error) {
        console.error('CrossRef search error:', error);
        return NextResponse.json(
            { error: 'Failed to search CrossRef' },
            { status: 500 }
        );
    }
}
