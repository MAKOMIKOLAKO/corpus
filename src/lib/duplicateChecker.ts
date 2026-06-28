// HIDDEN — only used by disabled features
interface DuplicateCheckRequest {
    url?: string;
    doi?: string;
    title?: string;
}

interface DuplicateCheckResponse {
    found: boolean;
    duplicates?: {
        exactMatches: any[];
        possibleMatches: any[];
        similarTitles: any[];
    };
    summary?: {
        total: number;
        exactMatches: number;
        possibleMatches: number;
        similarTitles: number;
    };
}

export async function checkDuplicatesBeforeSubmit(
    url?: string,
    doi?: string,
    title?: string
): Promise<DuplicateCheckResponse> {
    if (!url && !doi && !title) {
        return { found: false };
    }

    try {
        const response = await fetch('/api/entries/check-duplicates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, doi, title }),
        });

        if (!response.ok) {
            throw new Error('Failed to check duplicates');
        }

        return await response.json();
    } catch (error) {
        console.error('Error checking duplicates:', error);
        return { found: false };
    }
}

export function formatDuplicateMessage(response: DuplicateCheckResponse): string {
    if (!response.found) {
        return 'No duplicates found';
    }

    const { summary } = response;
    if (!summary) {
        return 'Potential duplicates found';
    }

    const messages = [];
    
    if (summary.exactMatches > 0) {
        messages.push(`${summary.exactMatches} exact match${summary.exactMatches > 1 ? 'es' : ''}`);
    }
    
    if (summary.similarTitles > 0) {
        messages.push(`${summary.similarTitles} similar title${summary.similarTitles > 1 ? 's' : ''}`);
    }
    
    if (summary.possibleMatches > 0) {
        messages.push(`${summary.possibleMatches} possible match${summary.possibleMatches > 1 ? 'es' : ''}`);
    }

    return `Found ${messages.join(', ')}`;
}

export function shouldProceedWithSubmission(response: DuplicateCheckResponse): boolean {
    if (!response.found) {
        return true;
    }

    const { summary } = response;
    if (!summary) {
        return true;
    }

    // Allow submission if no exact matches
    return summary.exactMatches === 0;
}
