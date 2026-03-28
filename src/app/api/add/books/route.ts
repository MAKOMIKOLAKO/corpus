import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Search query too short' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,isbn,publisher,number_of_pages_median,cover_i&limit=8`;

    const response = await fetch(olUrl, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: 'Open Library API error' }, { status: response.status });
    }

    const data = await response.json();
    const results = (data.docs || []).map((doc: any) => ({
      openLibraryKey: doc.key,
      title: doc.title,
      authors: doc.author_name || [],
      year: doc.first_publish_year || null,
      isbn: doc.isbn?.[0] || null,
      publisher: doc.publisher?.[0] || null,
      pages: doc.number_of_pages_median || null,
      coverUrl: doc.cover_i 
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` 
        : null
    }));

    return NextResponse.json({ results });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Search timed out. Please try again.' }, { status: 408 });
    }
    console.error('Book search error:', error);
    return NextResponse.json({ error: 'Failed to search books' }, { status: 500 });
  }
}
