import { NextRequest } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { timedJson } from '@/lib/serverTiming';
import { extractKeywords, extractAuthors, searchArxiv, ArxivPaper } from '@/lib/arxiv';
import { stripMarkupAndMath } from '@/lib/jatsMarkup';
import { discoverSortModeSchema } from '@/lib/validation';

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

    // Publisher abstracts (bioRxiv/medRxiv/PubMed) often carry raw JATS/LaTeX markup
    // (e.g. `<tex-math>`, `$\mathrm{SU}(2)$`). Left in, terms like "mathrm" or "alpha"
    // tokenize as high-frequency "keywords" and skew results toward LaTeX-adjacent
    // papers instead of the collection's actual topic, so strip it before extraction.
    const texts = globalEntries.flatMap((entry) =>
      [entry.title, entry.abstract]
        .filter((value): value is string => !!value)
        .map((value) => stripMarkupAndMath(value))
    );
    const authorLists = globalEntries.map((entry) => entry.authors);

    const keywords = extractKeywords(texts);
    const authors = extractAuthors(authorLists);

    const sortModeParam = request.nextUrl.searchParams.get('sortMode');
    let sortMode: 'relevance' | 'recency';
    if (sortModeParam === 'relevance' || sortModeParam === 'recency') {
      sortMode = sortModeParam;
    } else {
      // Only hit the DB for the persisted preference when the client didn't
      // already tell us the mode (e.g. first load before any client-side state exists).
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { discoverSortMode: true },
      });
      sortMode = user?.discoverSortMode === 'recency' ? 'recency' : 'relevance';
    }

    const arxivResults = await searchArxiv({ keywords, authors, sortMode });

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

    // Exclude papers already in the user's library rather than just flagging them —
    // a discover feed shouldn't keep recommending what's already saved.
    const papers: (ArxivPaper & { alreadySaved: boolean })[] = arxivResults
      .map((paper) => ({
        ...paper,
        alreadySaved: libraryIdentifiers.some((identifier) => identifier.includes(paper.arxivId)),
      }))
      .filter((paper) => !paper.alreadySaved);

    return timedJson({ papers, keywords, authors, sortMode }, startedAt, undefined, 'discover.get');
  } catch (error) {
    console.error('Error in discover route:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'discover.get');
  }
}

export async function PATCH(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'discover.patch');
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = discoverSortModeSchema.safeParse(raw);
    if (!parsed.success) {
      return timedJson(
        { error: 'Invalid input', details: parsed.error.flatten() },
        startedAt,
        { status: 400 },
        'discover.patch'
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { discoverSortMode: parsed.data.sortMode },
    });

    return timedJson({ sortMode: parsed.data.sortMode }, startedAt, undefined, 'discover.patch');
  } catch (error) {
    console.error('Error in discover PATCH route:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'discover.patch');
  }
}
