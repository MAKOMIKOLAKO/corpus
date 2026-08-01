import prisma from '@/lib/prisma';
import { createGlobalEntryOnly } from '@/lib/globalEntryService';
import { parseFeed } from '@/lib/rssParser';
import { callGemini } from '@/lib/geminiClient';
import { sanitizeJatsMarkup } from '@/lib/jatsMarkup';

export interface RSSIngestionResult {
  sourceId: string;
  entriesFound: number;
  entriesCreated: number;
}

const MAX_SUMMARY_INPUT_LENGTH = 8000;

async function enqueueSummary(globalEntryId: string, summaryInput: string, maxSentences = 3): Promise<void> {
  try {
    const text = summaryInput.slice(0, MAX_SUMMARY_INPUT_LENGTH);
    const prompt = `Create a concise summary of exactly ${maxSentences} sentence(s) for the following text. The summary should capture the main points clearly and briefly.

Text:
${text}

Summary:`;

    const summary = (await callGemini({
      model: 'gemini-2.5-flash',
      prompt,
      systemPrompt: 'You write concise, accurate summaries in plain text.',
      temperature: 0,
      feature: 'rss_entry_summarization',
      userId: null,
    })).trim();

    if (!summary) {
      return;
    }

    await prisma.globalEntry.update({
      where: { id: globalEntryId },
      data: { summary },
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
      abstract: (item.description || item.content)
        ? sanitizeJatsMarkup((item.description || item.content) as string)
        : undefined,
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
