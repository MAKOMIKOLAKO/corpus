/**
 * Per-user entry queue system
 * Manages asynchronous processing of entry submissions
 */

export type InputMode = 'link' | 'book' | 'paper';

export interface QueueSubmission {
  id: string;
  userId: string;
  mode: InputMode;
  input: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

class EntryQueue {
  private queues: Map<string, QueueSubmission[]> = new Map();
  private processing: Set<string> = new Set();

  /**
   * Add a submission to the user's queue
   */
  enqueue(userId: string, mode: InputMode, input: string): string {
    const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const submission: QueueSubmission = {
      id: submissionId,
      userId,
      mode,
      input,
      timestamp: Date.now(),
      status: 'pending'
    };

    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
    }

    const userQueue = this.queues.get(userId)!;
    userQueue.push(submission);

    // Start processing if not already running
    this.processQueue(userId);

    return submissionId;
  }

  /**
   * Get all submissions for a user
   */
  getUserQueue(userId: string): QueueSubmission[] {
    return this.queues.get(userId) || [];
  }

  /**
   * Process the next item in the user's queue
   */
  private async processQueue(userId: string) {
    if (this.processing.has(userId)) {
      return; // Already processing
    }

    this.processing.add(userId);

    const userQueue = this.queues.get(userId);
    if (!userQueue || userQueue.length === 0) {
      this.processing.delete(userId);
      return;
    }

    while (true) {
      const nextSubmission = userQueue.find(s => s.status === 'pending');
      if (!nextSubmission) {
        break;
      }

      nextSubmission.status = 'processing';

      try {
        const result = await this.processSubmission(nextSubmission);
        nextSubmission.result = result;
        nextSubmission.status = 'completed';
      } catch (error) {
        nextSubmission.error = error instanceof Error ? error.message : 'Unknown error';
        nextSubmission.status = 'failed';
      }
    }

    this.processing.delete(userId);
  }

  /**
   * Process a single submission based on its mode
   */
  private async processSubmission(submission: QueueSubmission): Promise<any> {
    let metadata;

    switch (submission.mode) {
      case 'link':
        metadata = await this.processLink(submission.input);
        break;
      case 'book':
        metadata = await this.processBook(submission.input);
        break;
      case 'paper':
        metadata = await this.processPaper(submission.input);
        break;
      default:
        throw new Error(`Unknown mode: ${submission.mode}`);
    }

    // Save to database
    const entry = await this.saveEntryToDatabase(submission.userId, metadata);
    return entry;
  }

  /**
   * Process a link - extract metadata using LLM
   */
  private async processLink(url: string): Promise<any> {
    const { extractMetadataFromLink } = await import('./metadataExtraction');
    return await extractMetadataFromLink(url);
  }

  /**
   * Process a book - search Open Library API
   */
  private async processBook(title: string): Promise<any> {
    const { fetchBookByTitle } = await import('./metadataExtraction');
    return await fetchBookByTitle(title);
  }

  /**
   * Process a paper - search Semantic Scholar API
   */
  private async processPaper(title: string): Promise<any> {
    const { fetchPaperByTitle } = await import('./metadataExtraction');
    return await fetchPaperByTitle(title);
  }

  /**
   * Clear old completed submissions (cleanup)
   */
  cleanup(userId: string, olderThan: number = 24 * 60 * 60 * 1000) {
    const userQueue = this.queues.get(userId);
    if (!userQueue) return;

    const cutoff = Date.now() - olderThan;
    const filtered = userQueue.filter(s =>
      s.status === 'pending' ||
      s.status === 'processing' ||
      s.timestamp > cutoff
    );

    this.queues.set(userId, filtered);
  }

  /**
   * Save extracted metadata as an entry in the database
   */
  private async saveEntryToDatabase(userId: string, metadata: any): Promise<any> {
    const prisma = (await import('./prisma')).prisma;

    // Check for duplicates by URL or normalized title
    const whereClause: any = {
      userId,
    };

    if (metadata.url) {
      whereClause.url = metadata.url;
    } else {
      // For books/papers without URLs, check by normalized title
      whereClause.title = {
        contains: metadata.title.split(':')[0].split('|')[0].trim(),
        mode: 'insensitive'
      };
    }

    const existingEntry = await prisma.entry.findFirst({
      where: whereClause,
    });

    if (existingEntry) {
      throw new Error('Duplicate entry already exists');
    }

    // Create slug from title
    const slug = metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    // Create the entry
    const entry = await prisma.entry.create({
      data: {
        title: metadata.title,
        slug: slug || undefined,
        authors: metadata.authors || [],
        year: metadata.year,
        contentType: metadata.contentType || 'ARTICLE',
        url: metadata.url || null,
        doi: metadata.doi || null,
        source: metadata.source || null,
        abstract: metadata.abstract || null,
        summary: metadata.summary || null,
        userId,
        readingStatus: 'UNREAD',
      },
    });

    return entry;
  }
}

// Singleton instance
export const entryQueue = new EntryQueue();
