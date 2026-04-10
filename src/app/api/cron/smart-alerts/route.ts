import { NextRequest, NextResponse } from 'next/server';
import { processAllAlerts } from '@/lib/alertProcessor';
import { prisma } from '@/lib/prismaWithRetry';
import { parseFeed, normalizeFeedItem } from '@/lib/rssParser';
import { getDeduplicationKeys, findExistingGlobalEntry, generateContentHash } from '@/lib/entryDedup';
import { normalizeUrl } from '@/lib/entryDedup';

// Verify cron job authorization
const CRON_SECRET = process.env.CRON_SECRET;

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${CRON_SECRET}`;
}

async function runCronTasks() {
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
}

export async function POST(request: NextRequest) {
  // Verify this is called by Vercel cron or with correct secret
  const authHeader = request.headers.get('authorization');
  console.log('=== CRON JOB STARTED ===');
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  console.log('Expected secret:', process.env.CRON_SECRET ? 'Set' : 'Missing');
  console.log('Timestamp:', new Date().toISOString());

  if (!isCronAuthorized(request)) {
    console.error('CRON: Authorization failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await runCronTasks();
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
  if (isCronAuthorized(request)) {
    try {
      return await runCronTasks();
    } catch (error) {
      console.error('[cron/smart-alerts] Fatal error:', error);

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

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return await runCronTasks();
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
    errors: [] as string[]
  };

  try {
    // Get all unique RSS feeds
    const sources = await prisma.source.findMany({
      include: {
        userSources: true
      }
    });

    console.log(`[cron/smart-alerts] Processing ${sources.length} RSS sources`);

    for (const source of sources) {
      try {
        results.sourcesProcessed++;

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

            // Get or create GlobalEntry ID
            let globalEntryId = existingEntryId;

            if (existingEntryId) {
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

              const globalEntry = await prisma.globalEntry.create({
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
              globalEntryId = globalEntry.id;
              results.entriesCreated++;
              console.log(`[cron/smart-alerts] Created entry: ${item.title}`);

              // Trigger AI summary generation asynchronously
              const summaryInput = item.description || item.content;
              if (summaryInput) {
                try {
                  fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/summarize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: summaryInput,
                      maxSentences: 3
                    })
                  }).then(async (res) => {
                    if (res.ok) {
                      const { summary } = await res.json();
                      await prisma.globalEntry.update({
                        where: { id: globalEntryId! },
                        data: { summary }
                      });
                    }
                  }).catch(err => {
                    console.error(`[cron/smart-alerts] Failed to generate summary:`, err);
                  });
                } catch (error) {
                  console.error(`[cron/smart-alerts] Error triggering summary:`, error);
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
