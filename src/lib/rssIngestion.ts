import prisma from '@/lib/prisma';
import { createGlobalEntryOnly } from '@/lib/globalEntryService';
import { parseFeed } from '@/lib/rssParser';

export interface RSSIngestionResult {
  sourceId: string;
  entriesFound: number;
  entriesCreated: number;
}

async function enqueueSummary(globalEntryId: string, summaryInput: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: summaryInput,
        maxSentences: 3,
      }),
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json().catch(() => null);
    if (!data?.summary || typeof data.summary !== 'string') {
      return;
    }

    await prisma.globalEntry.update({
      where: { id: globalEntryId },
      data: { summary: data.summary },
    });
  } catch (error) {
    console.error('[rssIngestion] Failed to generate summary:', error);
  }
}

export async function ingestSourceById(sourceId: string): Promise<RSSIngestionResult> {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      feedUrl: true,
      title: true,
      domain: true,
    },
  });

  if (!source) {
    throw new Error(`RSS source not found: ${sourceId}`);
  }

  const feed = await parseFeed(source.feedUrl);
  const displaySource = feed.title || source.title || source.domain;
  let entriesCreated = 0;

  for (const item of feed.items) {
    const result = await createGlobalEntryOnly({
      title: item.title,
      authors: item.author ? [item.author] : [],
      year: item.publishedDate?.getFullYear() ?? null,
      abstract: item.description || item.content,
      source: displaySource,
      url: item.url,
      rawContentType: 'ARTICLE',
      metadata: undefined,
      addedVia: 'rss_ingestion',
    });

    if (result.wasNew) {
      entriesCreated += 1;
      const summaryInput = item.description || item.content;
      if (summaryInput) {
        void enqueueSummary(result.globalEntryId, summaryInput);
      }
    }
  }

  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastFetchedAt: new Date(),
      title: displaySource,
      domain: source.domain,
    },
  });

  return {
    sourceId: source.id,
    entriesFound: feed.items.length,
    entriesCreated,
  };
}
