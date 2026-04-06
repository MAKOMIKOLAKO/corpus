import { prisma } from './prismaWithRetry';
import type { ContentType, Prisma, ReadingStatus } from '@prisma/client';
import { canAddEntry } from './plans';
import { toEntrySource } from '@/lib/utils';
import { saveEntryForUser } from './globalEntryService';

function getGeminiApiKey(): string | undefined {
  return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
}

function extractMeta(html: string) {
  const getTag = (pattern: RegExp) => {
    const match = html.match(pattern);
    return match ? match[1].trim() : null;
  };

  const ogTitle =
    getTag(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
    getTag(/name=["']og:title["']\s+content=["']([^"']+)["']/i);

  const ogDescription =
    getTag(/property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
    getTag(/name=["']og:description["']\s+content=["']([^"']+)["']/i);

  const ogSiteName =
    getTag(/property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+property=["']og:site_name["']/i) ||
    getTag(/name=["']og:site_name["']\s+content=["']([^"']+)["']/i);

  const metaDescription =
    getTag(/name=["']description["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+name=["']description["']/i);

  const metaAuthor =
    getTag(/name=["']author["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+name=["']author["']/i);

  const articlePublished =
    getTag(/property=["']article:published_time["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+property=["']article:published_time["']/i);

  const articleAuthor =
    getTag(/property=["']article:author["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+property=["']article:author["']/i);

  const titleTag = getTag(/<title[^>]*>([^<]+)<\/title>/i);

  const citationDoi =
    getTag(/name=["']citation_doi["']\s+content=["']([^"']+)["']/i) ||
    getTag(/content=["']([^"']+)["']\s+name=["']citation_doi["']/i);

  const bodyText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);

  const extractedTitle = ogTitle || titleTag;
  const extractedDescription = ogDescription || metaDescription;
  const extractedAuthor = metaAuthor || articleAuthor;

  return {
    ogTitle,
    ogDescription,
    ogSiteName,
    metaDescription,
    metaAuthor,
    articlePublished,
    articleAuthor,
    titleTag,
    citationDoi,
    bodyText,
    extractedTitle,
    extractedDescription,
    extractedAuthor,
  };
}

function metaFallback(url: string, meta: ReturnType<typeof extractMeta>) {
  let year: number | null = null;
  if (meta.articlePublished) {
    const d = new Date(meta.articlePublished);
    if (!Number.isNaN(d.getTime())) year = d.getFullYear();
  }
  const authors: string[] = [];
  if (meta.extractedAuthor) {
    meta.extractedAuthor.split(/[,;]/).forEach((a) => {
      const t = a.trim();
      if (t) authors.push(t);
    });
  }
  return {
    title: meta.extractedTitle || url,
    authors,
    year,
    description: meta.extractedDescription,
    source: meta.ogSiteName,
    contentType: 'ARTICLE' as const,
    doi: meta.citationDoi,
  };
}

async function userCanCreateEntry(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, entriesCount: true }
  });
  if (!user) return { ok: false, message: 'User not found' };

  const { allowed, reason } = canAddEntry(user.plan, user.entriesCount);
  if (!allowed) {
    return {
      ok: false,
      message: `You've reached the ${user.plan === 'FREE' ? '50' : 'unlimited'} entry limit on your plan.`,
    };
  }
  return { ok: true };
}

export async function processUserQueue(userId: string): Promise<void> {
  const pendingItem = await prisma.queueItem.findFirst({
    where: {
      userId,
      status: 'PENDING',
      inputType: 'URL',
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ],
  });

  if (!pendingItem) return;

  const processingItem = await prisma.queueItem.findFirst({
    where: { userId, status: 'PROCESSING' },
  });

  if (processingItem) return;

  const item = await prisma.queueItem.update({
    where: { id: pendingItem.id },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
    },
  });

  const url = item.input;

  const failAndContinue = async (errorMessage: string) => {
    await prisma.queueItem.update({
      where: { id: item.id },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    });
    await processUserQueue(userId);
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let html = '';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Corpus/1.0)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      await failAndContinue('Could not reach that URL');
      return;
    }
    html = await response.text();
  } catch {
    clearTimeout(timeoutId);
    await failAndContinue('Could not reach that URL');
    return;
  }

  const meta = extractMeta(html);

  const promptText = `Extract structured metadata from the following webpage content.
Return ONLY a valid JSON object with no explanation, no markdown,
no code blocks, using exactly this structure:
{
  "title": "the article or page title, not the site name",
  "authors": ["array of author full names, empty array if none"],
  "year": number or null,
  "description": "2-3 sentence summary of the content",
  "source": "website or publication name",
  "contentType": "one of: ARTICLE, BLOG, ESSAY, POLICY_REPORT, OTHER",
  "doi": "string or null"
}

URL: ${url}
Meta title: ${meta.extractedTitle || ''}
Meta description: ${meta.extractedDescription || ''}
Meta author: ${meta.extractedAuthor || ''}
Site name: ${meta.ogSiteName || ''}
Published: ${meta.articlePublished || ''}
Body text: ${meta.bodyText}`;

  const apiKey = getGeminiApiKey();
  let geminiResult: {
    title?: string;
    authors?: string[];
    year?: number | null;
    description?: string | null;
    source?: string | null;
    contentType?: string;
    doi?: string | null;
  };

  const fallback = metaFallback(url, meta);

  if (!apiKey) {
    geminiResult = fallback;
  } else {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            response_mime_type: 'application/json',
          },
        }),
      });

      if (!geminiResponse.ok) {
        geminiResult = fallback;
      } else {
        const geminiData = await geminiResponse.json();
        let text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          geminiResult = JSON.parse(text);
        } catch {
          geminiResult = fallback;
        }
      }
    } catch {
      geminiResult = fallback;
    }
  }

  const allowedTypes: ContentType[] = [
    'ARTICLE',
    'BLOG',
    'ESSAY',
    'POLICY_REPORT',
    'OTHER',
    'PAPER',
    'BOOK',
  ];
  const rawType = String(geminiResult.contentType || 'ARTICLE')
    .toUpperCase()
    .replace(/\s+/g, '_');
  const contentType = allowedTypes.includes(rawType as ContentType)
    ? (rawType as ContentType)
    : 'ARTICLE';

  let year: number | null = null;
  if (typeof geminiResult.year === 'number' && !Number.isNaN(geminiResult.year)) {
    year = geminiResult.year;
  } else if (geminiResult.year != null) {
    const n = Number(geminiResult.year);
    if (!Number.isNaN(n)) year = n;
  }
  if (year === null) year = fallback.year;

  const entryPayload = {
    title: geminiResult.title || meta.extractedTitle || url,
    authors: Array.isArray(geminiResult.authors) ? geminiResult.authors : fallback.authors,
    year,
    abstract: geminiResult.description ?? meta.extractedDescription ?? null,
    source: geminiResult.source ?? meta.ogSiteName ?? null,
    contentType,
    doi: geminiResult.doi ?? meta.citationDoi ?? null,
    url,
    readingStatus: 'UNREAD' as ReadingStatus,
    notes: [] as unknown[],
    metadata: {} as Record<string, unknown>,
  };

  const limitCheck = await userCanCreateEntry(userId);
  if (!limitCheck.ok) {
    await failAndContinue(limitCheck.message);
    return;
  }

  try {
    let userEntry;
    try {
      const result = await saveEntryForUser(
        userId,
        {
          title: entryPayload.title,
          authors: entryPayload.authors,
          year: entryPayload.year,
          abstract: entryPayload.abstract,
          source: toEntrySource(entryPayload.source),
          url: entryPayload.url,
          doi: entryPayload.doi,
          isbn: [], // No ISBN from URL fetch
          metadata: entryPayload.metadata as Record<string, any>,
          rawContentType: entryPayload.contentType,
          addedVia: 'manual',
        },
        {
          readingStatus: 'UNREAD',
          addedVia: 'url_fetch',
        }
      );

      userEntry = await prisma.userEntry.findUnique({
        where: { id: result.userEntryId }
      });
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      if (code === 'P2002') {
        // Entry already exists - find it
        userEntry = await prisma.userEntry.findFirst({
          where: {
            userId,
            globalEntry: {
              url: entryPayload.url
            }
          }
        });
        if (!userEntry) {
          throw new Error('Entry already exists but could not be retrieved');
        }
      } else {
        throw err;
      }
    }

    await prisma.queueItem.update({
      where: { id: item.id },
      data: {
        status: 'COMPLETED',
        result: entryPayload as object,
        entryId: userEntry?.id,
        globalEntryId: userEntry?.globalEntryId,
        completedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Processing failed';
    console.error('Queue processing error:', error);
    await prisma.queueItem.update({
      where: { id: item.id },
      data: {
        status: 'FAILED',
        errorMessage: message || 'Processing failed',
        completedAt: new Date(),
      },
    });
  }

  await processUserQueue(userId);
}

export async function triggerQueueProcessing(userId: string): Promise<void> {
  try {
    await processUserQueue(userId);
  } catch (e) {
    console.error('triggerQueueProcessing:', e);
  }
}
