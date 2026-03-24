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

function normalizeDescription(desc: unknown): string | null {
    if (!desc) return null;
    if (typeof desc === 'string') return desc;
    if (typeof desc === 'object' && desc && 'value' in desc && typeof (desc as any).value === 'string') return (desc as any).value;
    return null;
}

export async function GET(request: NextRequest) {
    try {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const { searchParams } = new URL(request.url);
        const isbn13Raw = searchParams.get('isbn13')?.trim();
        const editionKeyRaw = searchParams.get('editionKey')?.trim();

        if (!isbn13Raw && !editionKeyRaw) {
            return NextResponse.json({ error: 'isbn13 or editionKey is required' }, { status: 400 });
        }

        const editionKey = editionKeyRaw && /^OL\d+M$/.test(editionKeyRaw) ? editionKeyRaw : null;
        const isbn13 = isbn13Raw ? isbn13Raw.replace(/\D/g, '') : null;

        const primaryUrl = editionKey
            ? `https://openlibrary.org/books/${encodeURIComponent(editionKey)}.json`
            : `https://openlibrary.org/isbn/${encodeURIComponent(isbn13 as string)}.json`;

        const primaryRes = await fetch(primaryUrl, {
            headers: {
                'User-Agent': 'knowledge-indexer/1.0',
            },
        });

        if (!primaryRes.ok) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        const primaryData: any = await primaryRes.json();

        const resolvedIsbn13 = isbn13
            ? isbn13
            : Array.isArray(primaryData?.isbn_13) && typeof primaryData.isbn_13[0] === 'string'
                ? String(primaryData.isbn_13[0]).replace(/\D/g, '')
                : null;

        const authorKeys: string[] = Array.isArray(primaryData?.authors)
            ? primaryData.authors.map((a: any) => a?.key).filter((k: any) => typeof k === 'string')
            : [];

        const authorNames = await Promise.all(
            authorKeys.slice(0, 5).map(async (k) => {
                try {
                    const r = await fetch(`https://openlibrary.org${k}.json`, { headers: { 'User-Agent': 'knowledge-indexer/1.0' } });
                    if (!r.ok) return null;
                    const a = await r.json();
                    return typeof a?.name === 'string' ? a.name : null;
                } catch {
                    return null;
                }
            })
        );

        const workKey = Array.isArray(primaryData?.works) && primaryData.works[0]?.key && typeof primaryData.works[0].key === 'string'
            ? primaryData.works[0].key
            : null;

        let workDescription: string | null = null;
        if (workKey) {
            try {
                const workRes = await fetch(`https://openlibrary.org${workKey}.json`, { headers: { 'User-Agent': 'knowledge-indexer/1.0' } });
                if (workRes.ok) {
                    const workData: any = await workRes.json();
                    workDescription = normalizeDescription(workData?.description);
                }
            } catch {
                // ignore
            }
        }

        const description = workDescription || normalizeDescription(primaryData?.description);
        const publishers = Array.isArray(primaryData?.publishers)
            ? primaryData.publishers.filter((p: any) => typeof p === 'string')
            : [];

        const publishDate = typeof primaryData?.publish_date === 'string' ? primaryData.publish_date : null;
        const numberOfPages = typeof primaryData?.number_of_pages === 'number' ? primaryData.number_of_pages : null;

        const cover = resolvedIsbn13
            ? `https://covers.openlibrary.org/b/isbn/${resolvedIsbn13}-L.jpg`
            : editionKey
                ? `https://covers.openlibrary.org/b/olid/${editionKey}-L.jpg`
                : null;

        const payload = {
            title: typeof primaryData?.title === 'string' ? primaryData.title : 'Untitled',
            authors: authorNames.filter((n) => typeof n === 'string') as string[],
            publishers,
            publishDate,
            numberOfPages,
            description,
            isbn13: resolvedIsbn13 ? [resolvedIsbn13] : [],
            cover,
        };

        return NextResponse.json(payload, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('OpenLibrary book error:', error);
        return NextResponse.json({ error: 'Failed to fetch book details' }, { status: 500 });
    }
}
