/**
 * Search books API endpoint
 * Returns multiple book results for user selection
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Missing search query' },
      { status: 400 }
    );
  }

  try {
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,first_publish_year,isbn,cover_i,publisher&limit=8`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Open Library search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      results: data.docs || [],
      total: data.numFound || 0
    });

  } catch (error) {
    console.error('Book search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search books',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
