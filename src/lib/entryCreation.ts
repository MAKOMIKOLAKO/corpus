/**
 * Unified Entry Creation System
 * Ensures consistent entry creation across all entry points
 */

import { ContentType, ReadingStatus } from '@prisma/client';

export interface EntryData {
    title: string;
    authors: string;
    year: string;
    contentType: ContentType;
    url: string;
    doi: string;
    source: string;
    abstract: string;
    userKeywords: string;
    readingStatus: ReadingStatus;
    skipAI?: boolean; // Optional flag to skip AI generation
}

export interface CreationResult {
    success: boolean;
    entry?: any;
    existingEntry?: any;
    error?: string;
    confidence?: 'high' | 'medium' | 'low';
    reason?: string;
    limit?: number;
}

/**
 * Validates and sanitizes entry data before creation
 */
export function validateEntryData(data: Partial<EntryData>): EntryData {
    return {
        title: sanitizeString(data.title || 'Untitled Entry'),
        authors: sanitizeString(data.authors || ''),
        year: sanitizeString(data.year || ''),
        contentType: data.contentType || 'ARTICLE',
        url: sanitizeString(data.url || ''),
        doi: sanitizeString(data.doi || ''),
        source: sanitizeString(data.source || ''),
        abstract: sanitizeString(data.abstract || ''),
        userKeywords: sanitizeString(data.userKeywords || ''),
        readingStatus: data.readingStatus || 'UNREAD',
    };
}

/**
 * Creates a fallback entry when metadata is unavailable
 */
export function createFallbackEntry(url: string): Partial<EntryData> {
    try {
        const urlObj = new URL(url.trim());
        const hostname = urlObj.hostname || 'unknown-source';
        const title = url.trim(); // Use full URL as title

        return {
            title,
            authors: '',
            year: '',
            contentType: 'ARTICLE' as ContentType,
            url: url.trim(),
            doi: '',
            source: hostname,
            abstract: '',
            userKeywords: '',
            readingStatus: 'UNREAD' as ReadingStatus,
        };
    } catch (error) {
        console.error('Error creating fallback entry:', error);
        return {
            title: url.trim(),
            authors: '',
            year: '',
            contentType: 'ARTICLE' as ContentType,
            url: url.trim(),
            doi: '',
            source: 'unknown-source',
            abstract: '',
            userKeywords: '',
            readingStatus: 'UNREAD' as ReadingStatus,
        };
    }
}

/**
 * Sanitizes string input to prevent issues
 */
function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 1000); // Prevent excessively long strings
}

/**
 * Creates an entry with automatic metadata generation
 */
export async function createEntryWithMetadata(
    url: string,
    metadata: any = {},
    apiKey: string,
    skipAI: boolean = false
): Promise<CreationResult> {
    try {
        const entryData = validateEntryData({
            title: metadata.title || '',
            authors: Array.isArray(metadata.authors) ? metadata.authors.join(', ') : '',
            year: metadata.year ? metadata.year.toString() : '',
            contentType: metadata.contentType || 'ARTICLE',
            url: url.trim(),
            doi: metadata.doi || '',
            source: metadata.source || '',
            abstract: metadata.abstract || '',
            userKeywords: '',
            readingStatus: 'UNREAD',
            skipAI: skipAI,
        });

        // If we have minimal metadata, enhance with URL-based fallbacks
        if (!metadata.title && !metadata.abstract && !metadata.authors) {
            const fallback = createFallbackEntry(url);
            Object.assign(entryData, fallback);
        }

        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify(entryData),
        });

        if (response.ok) {
            const entry = await response.json();
            return { success: true, entry };
        } else {
            const errorData = await response.json();
            // Check if it's a duplicate error (status 409)
            if (response.status === 409 && errorData.duplicateEntry) {
                return {
                    success: false,
                    error: errorData.error || 'Duplicate entry detected',
                    existingEntry: errorData.duplicateEntry,
                    confidence: errorData.confidence,
                    reason: errorData.reason
                };
            }
            // Check if it's an entry limit error (status 403)
            if (response.status === 403 && errorData.error === 'entry_limit_reached') {
                return {
                    success: false,
                    error: 'entry_limit_reached',
                    limit: errorData.limit
                };
            }
            return { success: false, error: errorData.error || 'Failed to create entry' };
        }
    } catch (error: any) {
        console.error('Entry creation error:', error);
        return { success: false, error: error.message || 'Failed to create entry' };
    }
}
