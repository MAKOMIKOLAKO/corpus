import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canAddEntry } from '@/lib/plans';
import { saveEntryForUser } from '@/lib/globalEntryService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 3) {
      return NextResponse.json({ error: 'Search query too short' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const ssUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=8&fields=paperId,title,authors,year,abstract,venue,externalIds,openAccessPdf`;

    const response = await fetch(ssUrl, {
      headers: {
        "x-api-key": process.env.SEMANTIC_SCHOLAR_API_KEY || ""
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      return NextResponse.json({ error: 'Rate limit reached. Wait and try again.' }, { status: 429 });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errData.message || 'Semantic Scholar API error' }, { status: response.status });
    }

    const data = await response.json();
    const results = (data.data || []).map((paper: any) => {
      // URL priority logic: openAccessPdf > DOI > Semantic Scholar page
      let url = null;
      if (paper.openAccessPdf?.url) {
        url = paper.openAccessPdf.url;
      } else if (paper.externalIds?.DOI) {
        url = `https://doi.org/${paper.externalIds.DOI}`;
      } else {
        url = `https://www.semanticscholar.org/paper/${paper.paperId}`;
      }

      return {
        semanticScholarId: paper.paperId,
        title: paper.title,
        authors: (paper.authors || []).map((a: any) => a.name),
        year: paper.year || null,
        abstract: paper.abstract || null,
        source: paper.venue || null,
        doi: paper.externalIds?.DOI || null,
        url: url,
        metadata: {
          openAccessUrl: paper.openAccessPdf?.url || null
        }
      };
    });

    return NextResponse.json({ results });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Search timed out. Please try again.' }, { status: 408 });
    }
    console.error('Paper search error:', error);
    return NextResponse.json({ error: 'Failed to search papers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { arxivId, title, authors, abstract, year, url, pdfUrl } = body || {};

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, entriesCount: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { allowed, reason } = canAddEntry(user.plan, user.entriesCount);
    if (!allowed) {
      return NextResponse.json({ error: reason, limit: 50, current: user.entriesCount }, { status: 403 });
    }

    const result = await saveEntryForUser(
      userId,
      {
        title,
        authors: Array.isArray(authors) ? authors : [],
        year: year ? parseInt(String(year), 10) : null,
        abstract: abstract || null,
        source: 'arXiv',
        url: url || pdfUrl || null,
        doi: null,
        isbn: [],
        rawContentType: 'PAPER',
        metadata: { arxivId: arxivId || null, pdfUrl: pdfUrl || null },
      },
      { readingStatus: 'UNREAD', addedVia: 'discover' }
    );

    return NextResponse.json({
      entryId: result.userEntryId,
      globalEntryId: result.globalEntryId,
      isDuplicate: result.isDuplicate,
    });
  } catch (error: unknown) {
    console.error('Paper add error:', error);
    return NextResponse.json({ error: 'Failed to save paper' }, { status: 500 });
  }
}
