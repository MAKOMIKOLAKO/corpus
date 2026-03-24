import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
            'Access-Control-Max-Age': '86400',
        },
    });
}

function pickIsbn13(isbns: unknown): string | null {
    if (!Array.isArray(isbns)) return null;
    const isbn13 = isbns.find((i) => typeof i === 'string' && i.replace(/\D/g, '').length === 13);
    return typeof isbn13 === 'string' ? isbn13.replace(/\D/g, '') : null;
}

export async function GET(request: NextRequest) {
    try {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const { searchParams } = new URL(request.url);
        const title = searchParams.get('title')?.trim();

        if (!title) {
            return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }

        const fields = [
            'key',
            'title',
            'author_name',
            'first_publish_year',
            'edition_key',
            'isbn',
        ].join(',');
        const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=8&fields=${encodeURIComponent(fields)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'knowledge-indexer/1.0',
            },
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to search OpenLibrary' }, { status: 502 });
        }

        const data = await res.json();
        const docs: any[] = Array.isArray(data?.docs) ? data.docs : [];

        const results = docs
            .map((d) => {
                const isbn13 = pickIsbn13(d?.isbn);
                const editionKey = Array.isArray(d?.edition_key) && typeof d.edition_key[0] === 'string' ? d.edition_key[0] : null;
                const cover = isbn13
                    ? `https://covers.openlibrary.org/b/isbn/${isbn13}-S.jpg`
                    : editionKey
                        ? `https://covers.openlibrary.org/b/olid/${editionKey}-S.jpg`
                        : null;

                return {
                    key: typeof d?.key === 'string' ? d.key : null,
                    editionKey,
                    title: typeof d?.title === 'string' ? d.title : 'Untitled',
                    authors: Array.isArray(d?.author_name) ? d.author_name.filter((a: any) => typeof a === 'string').slice(0, 3) : [],
                    first_publish_year: typeof d?.first_publish_year === 'number' ? d.first_publish_year : null,
                    isbn13,
                    cover,
                };
            })
            .filter((r) => r.title);

        return NextResponse.json({ results }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('OpenLibrary search error:', error);
        return NextResponse.json({ error: 'Failed to search OpenLibrary' }, { status: 500 });
    }
}
