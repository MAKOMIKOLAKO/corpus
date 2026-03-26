/**
 * Gemini API Request Queue System
 * Prevents rate limiting and manages concurrent requests
 */

interface QueuedRequest {
  id: string;
  text: string;
  resolve: (result: { topics: string[]; keywords: string[] }) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class GeminiRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly MAX_CONCURRENT = 2; // Max concurrent Gemini requests
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private readonly REQUEST_TIMEOUT = 30000; // 30 second timeout
  private activeCount = 0;
  private lastRequestTime = 0;

  /**
   * Add a request to the queue
   */
  async enqueue(text: string): Promise<{ topics: string[]; keywords: string[] }> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.queue.push(request);
      
      // Set timeout for the request
      const timeout = setTimeout(() => {
        this.removeFromQueue(request.id);
        reject(new Error('Request timeout'));
      }, this.REQUEST_TIMEOUT);

      // Override resolve/reject to clear timeout
      const originalResolve = resolve;
      const originalReject = reject;
      request.resolve = (result) => {
        clearTimeout(timeout);
        originalResolve(result);
      };
      request.reject = (error) => {
        clearTimeout(timeout);
        originalReject(error);
      };

      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.activeCount >= this.MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeCount < this.MAX_CONCURRENT) {
      const request = this.queue.shift();
      if (!request) break;

      // Rate limiting: wait between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
        await this.sleep(this.RATE_LIMIT_DELAY - timeSinceLastRequest);
      }

      this.activeCount++;
      this.lastRequestTime = Date.now();

      // Process request asynchronously
      this.processRequest(request).finally(() => {
        this.activeCount--;
        // Continue processing queue
        setImmediate(() => this.processQueue());
      });
    }

    this.processing = false;
  }

  /**
   * Process individual request
   */
  private async processRequest(request: QueuedRequest): Promise<void> {
    try {
      const result = await this.generateMetadata(request.text);
      request.resolve(result);
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Generate metadata using Gemini API
   */
  private async generateMetadata(text: string): Promise<{ topics: string[]; keywords: string[] }> {
    const { GoogleGenAI } = await import('@google/genai');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    try {
      // Generate both topics and keywords in parallel
      const [topicsPromise, keywordsPromise] = await Promise.all([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Assign 1 to 3 broad academic or editorial topic labels to the following text. Topics should be mid-level in specificity — broad enough to group many related entries together, but specific enough to be meaningful. For example, use 'Robotics Research' instead of 'Wearable Exoskeleton Motor Control', and use 'Economics' instead of 'Social Sciences'. Return only a JSON array of strings, no explanation.\n\nText: ${text}`,
          config: {
            responseMimeType: 'application/json',
          }
        }),
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are a metadata extraction assistant. Extract 5 to 8 concise, specific keywords from the following academic or editorial text. Return only a JSON array of strings, no explanation.\n\nText: ${text}`,
          config: {
            responseMimeType: 'application/json',
          }
        })
      ]);

      // Process responses
      let topics: string[] = [];
      const topicsResultText = topicsPromise.text || '[]';
      try {
        const parsed = JSON.parse(topicsResultText);
        if (Array.isArray(parsed)) {
          topics = parsed.slice(0, 3);
        }
      } catch (e) {
        console.error('Failed to parse topics response:', topicsResultText);
      }

      let keywords: string[] = [];
      const keywordsResultText = keywordsPromise.text || '[]';
      try {
        const parsed = JSON.parse(keywordsResultText);
        if (Array.isArray(parsed)) {
          keywords = parsed.slice(0, 8);
        }
      } catch (e) {
        console.error('Failed to parse keywords response:', keywordsResultText);
      }

      return { topics, keywords };
    } catch (error) {
      console.error('Error generating metadata:', error);
      throw error;
    }
  }

  /**
   * Remove request from queue
   */
  private removeFromQueue(requestId: string): void {
    this.queue = this.queue.filter(req => req.id !== requestId);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  getStats(): { queueLength: number; activeCount: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      processing: this.processing
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

// Singleton instance
export const geminiQueue = new GeminiRequestQueue();
