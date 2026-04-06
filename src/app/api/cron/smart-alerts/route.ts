import { NextRequest, NextResponse } from 'next/server';
import { processAllAlerts } from '@/lib/alertProcessor';
import { prisma } from '@/lib/prismaWithRetry';
import { parseFeed, normalizeFeedItem } from '@/lib/rssParser';
import { getDeduplicationKeys, findExistingGlobalEntry, generateContentHash } from '@/lib/entryDedup';
import { normalizeUrl } from '@/lib/entryDedup';
import type { GlobalEntry } from '@prisma/client';

// Verify cron job authorization
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  // Verify this is called by Vercel cron or with correct secret
  const authHeader = request.headers.get('authorization');
  console.log('=== CRON JOB STARTED ===');
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  console.log('Expected secret:', process.env.CRON_SECRET ? 'Set' : 'Missing');
  console.log('Timestamp:', new Date().toISOString());

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('CRON: Authorization failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[cron/smart-alerts] Starting daily tasks...');
    console.log('[cron/smart-alerts] Environment check:', {
      hasSemanticScholarKey: !!process.env.SEMANTIC_SCHOLAR_API_KEY,
      hasGoogleKey: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
      nodeEnv: process.env.NODE_ENV
    });

    // Run RSS ingestion first
    console.log('[cron/smart-alerts] Starting RSS ingestion...');
    const rssResults = await runRSSIngestion();
    console.log('[cron/smart-alerts] RSS ingestion complete:', rssResults);

    // Then run smart alerts
    console.log('[cron/smart-alerts] Starting alert processing...');
    const alertResults = await processAllAlerts();
    console.log('[cron/smart-alerts] Alert processing complete:', alertResults);

    return NextResponse.json({
      success: true,
      rss: rssResults,
      alerts: {
        processed: alertResults.queriesProcessed,
        papersAdded: alertResults.totalPapersAdded,
        errors: alertResults.errors.length
      }
    });
  } catch (error) {
    console.error('[cron/smart-alerts] Fatal error:', error);

    // Special handling for stack overflow
    if (error instanceof RangeError && error.message.includes('stack')) {
      console.error('[cron/smart-alerts] Stack overflow detected!');
      console.error('This usually happens when processing users with too many entries');
      console.error('Stack trace:', error.stack);
      return NextResponse.json({
        error: 'Stack overflow - too much data to process',
        details: 'Consider reducing the take limit in alertProcessor.ts'
      }, { status: 500 });
    }

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// Allow GET for testing (but require auth in production)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    // In production, only allow POST with proper authorization
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // For development/testing, allow GET with admin session
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/authOptions');

  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
  }

  try {
    const results = await processAllAlerts();
    console.log('[cron/smart-alerts] Manual trigger complete:', results);

    return NextResponse.json({
      success: true,
      processed: results.queriesProcessed,
      papersAdded: results.totalPapersAdded,
      errors: results.errors
    });
  } catch (error) {
    console.error('[cron/smart-alerts] Manual trigger error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// RSS ingestion function
async function runRSSIngestion() {
  const results = {
    sourcesProcessed: 0,
    entriesFound: 0,
    entriesCreated: 0,
    userEntriesCreated: 0,
    errors: [] as string[]
  };

  try {
    // Get all unique RSS feeds
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

    console.log(`[cron/smart-alerts] Processing ${sources.length} RSS sources`);

    for (const source of sources) {
      try {
        results.sourcesProcessed++;

        // Skip if no users are subscribed
        if (source.userSources.length === 0) {
          console.log(`[cron/smart-alerts] Skipping ${source.feedUrl} - no subscribers`);
          continue;
        }

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
              console.log(`[cron/smart-alerts] Entry already exists: ${item.title}`);
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
                  abstract: item.description || item.content,
                  url: item.url,
                  source: source.title || source.domain,
                  normalizedTitle: normalized.normalizedTitle,
                  normalizedFirstAuthor: normalized.normalizedFirstAuthor,
                  publicationYear: normalized.publicationYear,
                  canonicalUrl: normalized.canonicalUrl,
                  contentHash,
                  addedVia: 'rss_ingestion'
                }
              });
              results.entriesCreated++;
              console.log(`[cron/smart-alerts] Created entry: ${item.title}`);

              // Trigger AI summary generation asynchronously
              if (item.description || item.content) {
                try {
                  fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/summarize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: item.description || item.content,
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
                    console.error(`[cron/smart-alerts] Failed to generate summary:`, err);
                  });
                } catch (error) {
                  console.error(`[cron/smart-alerts] Error triggering summary:`, error);
                }
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
                    console.error(`[cron/smart-alerts] Error creating user entry:`, error);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`[cron/smart-alerts] Error processing item:`, error);
            results.errors.push(`Error processing item from ${source.feedUrl}: ${error}`);
          }
        }

        // Update source last fetched timestamp
        await prisma.source.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date() }
        });
      } catch (error) {
        console.error(`[cron/smart-alerts] Error processing source ${source.feedUrl}:`, error);
        results.errors.push(`Error processing source ${source.feedUrl}: ${error}`);
      }
    }

    console.log(`[cron/smart-alerts] RSS ingestion complete:`, results);
    return results;
  } catch (error) {
    console.error('[cron/smart-alerts] RSS ingestion failed:', error);
    results.errors.push(`RSS ingestion failed: ${error}`);
    return results;
  }
}
