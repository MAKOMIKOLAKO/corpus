import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    duplicateEntry?: any;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

export async function checkForDuplicates(
    url?: string | null,
    doi?: string | null,
    title?: string | null
): Promise<DuplicateCheckResult> {
    if (!url && !doi && !title) {
        return { isDuplicate: false, confidence: 'low', reason: 'No search criteria provided' };
    }

    try {
        // Build search criteria
        const searchCriteria = [];

        if (url) {
            searchCriteria.push({ url });
        }

        if (doi) {
            searchCriteria.push({ doi });
        }

        if (title) {
            searchCriteria.push({ title });
        }

        // Find potential duplicates
        const duplicates = await prisma.entry.findMany({
            where: {
                OR: searchCriteria
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5 // Limit to 5 most recent potential duplicates
        });

        if (duplicates.length === 0) {
            return { isDuplicate: false, confidence: 'low', reason: 'No duplicates found' };
        }

        // Check for exact matches first (highest confidence)
        for (const entry of duplicates) {
            if (url && entry.url === url) {
                return {
                    isDuplicate: true,
                    duplicateEntry: entry,
                    confidence: 'high',
                    reason: 'Exact URL match'
                };
            }

            if (doi && entry.doi === doi) {
                return {
                    isDuplicate: true,
                    duplicateEntry: entry,
                    confidence: 'high',
                    reason: 'Exact DOI match'
                };
            }

            if (title && entry.title.toLowerCase() === title.toLowerCase()) {
                return {
                    isDuplicate: true,
                    duplicateEntry: entry,
                    confidence: 'high',
                    reason: 'Exact title match'
                };
            }
        }

        // Check for similar titles (medium confidence)
        if (title) {
            for (const entry of duplicates) {
                const titleSimilarity = calculateTitleSimilarity(title, entry.title);
                if (titleSimilarity > 0.8) {
                    return {
                        isDuplicate: true,
                        duplicateEntry: entry,
                        confidence: 'medium',
                        reason: `High title similarity (${Math.round(titleSimilarity * 100)}%)`
                    };
                }
            }
        }

        // Low confidence matches should not block entry creation
        // They can be shown as suggestions but shouldn't prevent saving
        return {
            isDuplicate: false,
            confidence: 'low',
            reason: 'No high-confidence duplicates found'
        };

    } catch (error) {
        console.error('Error checking duplicates:', error);
        return { isDuplicate: false, confidence: 'low', reason: 'Error checking duplicates' };
    }
}

function calculateTitleSimilarity(title1: string, title2: string): number {
    const t1 = title1.toLowerCase().trim();
    const t2 = title2.toLowerCase().trim();

    if (t1 === t2) return 1.0;

    // Simple similarity based on common words
    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return commonWords.length / totalWords;
}

export async function getDuplicateSuggestions(
    url?: string | null,
    doi?: string | null,
    title?: string | null
): Promise<any[]> {
    if (!url && !doi && !title) {
        return [];
    }

    try {
        const searchCriteria = [];

        if (url) searchCriteria.push({ url });
        if (doi) searchCriteria.push({ doi });
        if (title) searchCriteria.push({ title });

        const suggestions = await prisma.entry.findMany({
            where: {
                OR: searchCriteria
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10,
            select: {
                id: true,
                title: true,
                authors: true,
                year: true,
                url: true,
                doi: true,
                createdAt: true
            }
        });

        return suggestions.map(entry => ({
            ...entry,
            matchReason: getMatchReason(entry, { url, doi, title })
        }));

    } catch (error) {
        console.error('Error getting duplicate suggestions:', error);
        return [];
    }
}

function getMatchReason(entry: any, searchParams: { url?: string | null, doi?: string | null, title?: string | null }): string {
    const reasons = [];

    if (searchParams.url && entry.url === searchParams.url) {
        reasons.push('URL match');
    }

    if (searchParams.doi && entry.doi === searchParams.doi) {
        reasons.push('DOI match');
    }

    if (searchParams.title) {
        if (entry.title.toLowerCase() === searchParams.title.toLowerCase()) {
            reasons.push('Exact title match');
        } else if (entry.title.toLowerCase().includes(searchParams.title.toLowerCase()) ||
            searchParams.title.toLowerCase().includes(entry.title.toLowerCase())) {
            reasons.push('Similar title');
        }
    }

    return reasons.join(', ') || 'Possible match';
}
