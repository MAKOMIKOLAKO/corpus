import { NextRequest } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { timedJson } from '@/lib/serverTiming';
import { extractKeywords, extractAuthors, searchArxiv, ArxivPaper } from '@/lib/arxiv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'discover.get');
    }

    const collectionId = request.nextUrl.searchParams.get('collectionId');
    if (!collectionId) {
      return timedJson({ error: 'collectionId is required' }, startedAt, { status: 400 }, 'discover.get');
    }

    const collectionEntries = await prisma.userEntryCollection.findMany({
      where: {
        collectionId,
        userEntry: { userId },
      },
      select: {
        userEntry: {
          select: {
            globalEntry: {
              select: { title: true, abstract: true, authors: true },
            },
          },
        },
      },
    });

    if (collectionEntries.length < 2) {
      return timedJson({ error: 'not_enough_entries', papers: [] }, startedAt, undefined, 'discover.get');
    }

    const globalEntries = collectionEntries.map((entry) => entry.userEntry.globalEntry);

    const texts = globalEntries.flatMap((entry) =>
      [entry.title, entry.abstract].filter((value): value is string => !!value)
    );
    const authorLists = globalEntries.map((entry) => entry.authors);

    const keywords = extractKeywords(texts);
    const authors = extractAuthors(authorLists);

    const arxivResults = await searchArxiv({ keywords, authors });

    const libraryEntries = await prisma.userEntry.findMany({
      where: { userId },
      select: {
        globalEntry: {
          select: { doi: true, url: true },
        },
      },
    });

    const libraryIdentifiers = libraryEntries
      .flatMap((entry) => [entry.globalEntry?.doi, entry.globalEntry?.url])
      .filter((value): value is string => !!value);

    const papers: (ArxivPaper & { alreadySaved: boolean })[] = arxivResults.map((paper) => ({
      ...paper,
      alreadySaved: libraryIdentifiers.some((identifier) => identifier.includes(paper.arxivId)),
    }));

    return timedJson({ papers, keywords, authors }, startedAt, undefined, 'discover.get');
  } catch (error) {
    console.error('Error in discover route:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'discover.get');
  }
}
