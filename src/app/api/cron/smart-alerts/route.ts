import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI, Chat } from '@google/genai';

// Verify cron job authorization
const CRON_SECRET = process.env.CRON_SECRET;

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  authors: Array<{ name: string; authorId?: string }>;
  year?: number;
  url?: string;
  doi?: string;
  venue?: string;
  publicationDate?: string;
}

interface ProcessedPaper {
  title: string;
  abstract?: string;
  authors: string[];
  year?: number;
  url?: string;
  doi?: string;
  publicationDate?: string;
}

async function fetchPapersFromSemanticScholar(query: string): Promise<SemanticScholarPaper[]> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const baseUrl = 'https://api.semanticscholar.org/graph/v1';

  // Get papers from the last 3 days
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const year = threeDaysAgo.getFullYear();
  const month = String(threeDaysAgo.getMonth() + 1).padStart(2, '0');
  const day = String(threeDaysAgo.getDate()).padStart(2, '0');
  const minDate = `${year}-${month}-${day}`;

  const url = `${baseUrl}/paper/search?query=${encodeURIComponent(query)}&fields=title,abstract,authors,year,url,doi,venue,publicationDate&year=${minDate}-&limit=30`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching papers from Semantic Scholar:', error);
    return [];
  }
}

async function checkPaperRelevance(query: string, paper: ProcessedPaper): Promise<boolean> {
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '',
  });
  const chat = new Chat((genAI as any).models.apiClient, genAI.models, 'gemini-1.5-flash');

  const prompt = `You are a research assistant helping determine if a paper is relevant to a user's research interests.

User Query: "${query}"
Paper Title: "${paper.title}"
Paper Abstract: "${paper.abstract || 'No abstract available'}"

Is this paper relevant to the user's query? Please respond with only "YES" or "NO". Consider:
- Does the paper address the main topic or concepts in the query?
- Are the research questions or findings aligned with the user's interests?
- Is the methodology or subject matter relevant?

Answer:`;

  try {
    const result = await chat.sendMessage({ message: prompt });
    const text = result.text?.trim().toUpperCase();

    return text === 'YES';
  } catch (error) {
    console.error('Error checking paper relevance with Gemini:', error);
    // Default to not relevant if there's an error
    return false;
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);

  // Simple Levenshtein-like similarity
  const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

function hasOverlappingAuthors(authors1: string[], authors2: string[]): boolean {
  const normalizedAuthors1 = authors1.map(author =>
    author.toLowerCase().replace(/[^\w\s]/g, '').trim()
  );
  const normalizedAuthors2 = authors2.map(author =>
    author.toLowerCase().replace(/[^\w\s]/g, '').trim()
  );

  return normalizedAuthors1.some(author1 =>
    normalizedAuthors2.some(author2 => {
      // Check for exact match or very close match
      const similarity = calculateTitleSimilarity(author1, author2);
      return similarity > 0.8;
    })
  );
}

async function isDuplicatePaper(
  paper: ProcessedPaper,
  userId: string
): Promise<boolean> {
  // Check by DOI (primary)
  if (paper.doi) {
    const existingByDoi = await prisma.entry.findFirst({
      where: {
        userId,
        doi: paper.doi,
      },
    });
    if (existingByDoi) return true;
  }

  // Check by URL (weak signal)
  if (paper.url) {
    const existingByUrl = await prisma.entry.findFirst({
      where: {
        userId,
        url: paper.url,
      },
    });
    if (existingByUrl) return true;
  }

  // Check by title + author similarity (fallback)
  const existingEntries = await prisma.entry.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      title: true,
      authors: true,
    },
  });

  for (const existing of existingEntries) {
    const titleSimilarity = calculateTitleSimilarity(paper.title, existing.title);

    if (titleSimilarity > 0.85 && hasOverlappingAuthors(paper.authors, existing.authors)) {
      return true;
    }
  }

  return false;
}

async function createNotification(userId: string, query: string, count: number) {
  const message = `${count} new paper${count > 1 ? 's' : ''} added for "${query}"`;

  await prisma.notification.create({
    data: {
      userId,
      type: 'SMART_ALERT',
      message,
    },
  });
}

export async function POST(request: NextRequest) {
  // Verify this is a cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting smart alerts cron job...');

    // Get all active watch queries
    const watchQueries = await prisma.watchQuery.findMany({
      where: {
        isActive: true,
        OR: [
          { lastCheckedAt: null },
          {
            lastCheckedAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // More than 24 hours ago
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            plan: true,
          }
        }
      }
    });

    console.log(`Found ${watchQueries.length} active watch queries to process`);

    for (const watchQuery of watchQueries) {
      // Skip if user is not Pro anymore
      if (watchQuery.user.plan === 'FREE') {
        console.log(`Skipping query for free user ${watchQuery.userId}`);
        continue;
      }

      console.log(`Processing query: "${watchQuery.query}" for user ${watchQuery.userId}`);

      // Step 1: Fetch candidate papers
      const candidatePapers = await fetchPapersFromSemanticScholar(watchQuery.query);
      console.log(`Found ${candidatePapers.length} candidate papers`);

      if (candidatePapers.length === 0) {
        // Update last checked time even if no papers found
        await prisma.watchQuery.update({
          where: { id: watchQuery.id },
          data: { lastCheckedAt: new Date() },
        });
        continue;
      }

      // Step 2: Filter with LLM and deduplicate
      const relevantPapers: ProcessedPaper[] = [];

      for (const paper of candidatePapers) {
        const processedPaper: ProcessedPaper = {
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors.map(author => author.name),
          year: paper.year,
          url: paper.url,
          doi: paper.doi,
          publicationDate: paper.publicationDate,
        };

        // Check if already exists
        const isDuplicate = await isDuplicatePaper(processedPaper, watchQuery.userId);
        if (isDuplicate) {
          console.log(`Skipping duplicate paper: ${paper.title}`);
          continue;
        }

        // Check relevance with LLM
        const isRelevant = await checkPaperRelevance(watchQuery.query, processedPaper);
        if (isRelevant) {
          relevantPapers.push(processedPaper);
          console.log(`Relevant paper: ${paper.title}`);
        }
      }

      // Step 3: Create entries for relevant papers
      if (relevantPapers.length > 0) {
        console.log(`Creating ${relevantPapers.length} entries...`);

        for (const paper of relevantPapers) {
          try {
            const entry = await prisma.entry.create({
              data: {
                title: paper.title,
                abstract: paper.abstract,
                authors: paper.authors,
                year: paper.year,
                url: paper.url,
                doi: paper.doi,
                publishDate: paper.publicationDate,
                contentType: 'PAPER',
                source: 'SMART_ALERT',
                addedByQueryId: watchQuery.id,
                userId: watchQuery.userId,
              },
            });

            // Add to collection
            await prisma.entryCollection.create({
              data: {
                entryId: entry.id,
                collectionId: watchQuery.collectionId,
              },
            });
          } catch (error) {
            console.error(`Error creating entry for paper: ${paper.title}`, error);
          }
        }

        // Step 4: Create notification
        await createNotification(watchQuery.userId, watchQuery.query, relevantPapers.length);
      }

      // Step 5: Update query last checked time
      await prisma.watchQuery.update({
        where: { id: watchQuery.id },
        data: { lastCheckedAt: new Date() },
      });

      console.log(`Completed processing query: "${watchQuery.query}"`);
    }

    console.log('Smart alerts cron job completed successfully');
    return NextResponse.json({ message: 'Smart alerts processed successfully' });
  } catch (error) {
    console.error('Error in smart alerts cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Allow GET for testing (but require auth in production)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed in production' }, { status: 405 });
  }

  // For testing, we'll manually trigger the POST logic
  return POST(request);
}
