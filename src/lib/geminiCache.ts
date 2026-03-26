/**
 * Gemini API Response Caching System
 * Reduces latency by caching topic and keyword generation results
 */

import crypto from 'crypto';

interface CacheEntry {
  topics: string[];
  keywords: string[];
  timestamp: number;
  ttl: number;
}

class GeminiCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Start periodic cleanup
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Generate cache key from text content
   */
  private generateKey(text: string): string {
    // Normalize text: lowercase, trim, remove extra whitespace
    const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get cached response for text
   */
  get(text: string): { topics?: string[]; keywords?: string[] } | null {
    if (!text) return null;

    const key = this.generateKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return {
      topics: entry.topics,
      keywords: entry.keywords
    };
  }

  /**
   * Set cache entry for text
   */
  set(text: string, topics: string[], keywords: string[], ttl: number = this.DEFAULT_TTL): void {
    if (!text) return;

    const key = this.generateKey(text);

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      topics: topics.slice(0, 3), // Limit topics to 3
      keywords: keywords.slice(0, 8), // Limit keywords to 8
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
}

// Singleton instance
export const geminiCache = new GeminiCache();
