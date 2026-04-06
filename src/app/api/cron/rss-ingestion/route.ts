import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import { parseFeed, normalizeFeedItem } from '@/lib/rssParser';
import { getDeduplicationKeys, findExistingGlobalEntry, generateContentHash } from '@/lib/entryDedup';
import { normalizeUrl } from '@/lib/entryDedup';
import type { GlobalEntry } from '@prisma/client';

// Verify cron job authorization
const CRON_SECRET = process.env.CRON_SECRET;

interface IngestionResults {
  sourcesProcessed: number;
  entriesFound: number;
  entriesCreated: number;
  userEntriesCreated: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  // Verify this is called by Vercel cron or with correct secret
  const authHeader = request.headers.get('authorization');
  console.log('=== RSS INGESTION CRON STARTED ===');
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  console.log('Timestamp:', new Date().toISOString());

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('CRON: Authorization failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: IngestionResults = {
    sourcesProcessed: 0,
    entriesFound: 0,
    entriesCreated: 0,
    userEntriesCreated: 0,
    errors: []
  };

  try {
    console.log('[cron/rss-ingestion] Starting RSS ingestion...');

    // Get all unique sources
    const sources = await prisma.source.findMany({
      include: {
        userSources: {
          include: {
            user: {
              select: { id: true }
            }
          }
        }
      }
    });

    console.log(`[cron/rss-ingestion] Found ${sources.length} sources to process`);

    for (const source of sources) {
      try {
        console.log(`[cron/rss-ingestion] Processing source: ${source.feedUrl}`);

        // Parse the feed
        const feed = await parseFeed(source.feedUrl);
        results.entriesFound += feed.items.length;

        // Process each item
        for (const item of feed.items) {
          try {
            // Normalize the item for deduplication
            const normalized = normalizeFeedItem(item);

            // Get deduplication keys
            const dedupKeys = getDeduplicationKeys({
              doi: null,
              isbn: null,
              title: item.title,
              authors: item.author ? [item.author] : [],
              url: item.url
            });

            // Check if entry already exists
            const existingEntryId = await findExistingGlobalEntry(prisma, dedupKeys);

            let globalEntry: GlobalEntry | null = null;

            if (existingEntryId) {
              globalEntry = await prisma.globalEntry.findUnique({
                where: { id: existingEntryId }
              });
              console.log(`[cron/rss-ingestion] Entry already exists: ${item.title}`);
            } else {
              // Create new global entry
              const contentHash = generateContentHash({
                doi: null,
                isbn: null,
                normalizedTitle: normalized.normalizedTitle,
                normalizedFirstAuthor: normalized.normalizedFirstAuthor,
                publicationYear: normalized.publicationYear,
                canonicalUrl: normalized.canonicalUrl
              });

              globalEntry = await prisma.globalEntry.create({
                data: {
                  title: item.title,
                  authors: item.author ? [item.author] : [],
                  year: normalized.publicationYear,
                  abstract: item.description,
                  source: source.domain,
                  url: item.url,
                  canonicalUrl: normalized.canonicalUrl,
                  contentHash,
                  normalizedTitle: normalized.normalizedTitle,
                  normalizedFirstAuthor: normalized.normalizedFirstAuthor,
                  publicationYear: normalized.publicationYear,
                  addedVia: 'rss_ingestion',
                  rawContentType: 'ARTICLE'
                }
              });

              results.entriesCreated++;
              console.log(`[cron/rss-ingestion] Created new entry: ${item.title}`);

              // Trigger AI summary generation (non-blocking)
              try {
                const summaryText = item.description || item.content || '';
                if (summaryText.length > 50) {
                  fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/summarize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: summaryText,
                      maxSentences: 3
                    })
                  }).then(async (res) => {
                    if (res.ok) {
                      const { summary } = await res.json();
                      if (globalEntry) {
                        await prisma.globalEntry.update({
                          where: { id: globalEntry.id },
                          data: { summary }
                        });
                      }
                    }
                  }).catch(err => {
                    console.error(`[cron/rss-ingestion] Failed to generate summary:`, err);
                  });
                }
              } catch (error) {
                console.error(`[cron/rss-ingestion] Error triggering summary:`, error);
              }
            }

            // Create UserEntry for each subscribed user
            if (globalEntry) {
              for (const userSource of source.userSources) {
                try {
                  await prisma.userEntry.upsert({
                    where: {
                      userId_globalEntryId: {
                        userId: userSource.user.id,
                        globalEntryId: globalEntry.id
                      }
                    },
                    update: {}, // Don't update existing
                    create: {
                      userId: userSource.user.id,
                      globalEntryId: globalEntry.id,
                      addedVia: 'rss_ingestion'
                    }
                  });
                  results.userEntriesCreated++;
                } catch (error) {
                  // Likely duplicate, which is fine
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  if (!errorMessage.includes('Unique constraint')) {
                    console.error(`[cron/rss-ingestion] Error creating user entry:`, error);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`[cron/rss-ingestion] Error processing item:`, error);
            results.errors.push(`Error processing item from ${source.feedUrl}: ${error}`);
          }
        }

        // Update source last fetched timestamp
        await prisma.source.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date() }
        });

        results.sourcesProcessed++;
      } catch (error) {
        console.error(`[cron/rss-ingestion] Error processing source ${source.feedUrl}:`, error);
        results.errors.push(`Error processing source ${source.feedUrl}: ${error}`);
      }
    }

    console.log('[cron/rss-ingestion] Ingestion complete:', results);

    return NextResponse.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('[cron/rss-ingestion] Fatal error:', error);
    results.errors.push(`Fatal error: ${error}`);

    return NextResponse.json({
      error: 'Processing failed',
      ...results
    }, { status: 500 });
  }
}

// Allow GET for testing (but require auth in production)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/authOptions');

  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
  }

  // Execute the same logic as POST
  return POST(request);
}
