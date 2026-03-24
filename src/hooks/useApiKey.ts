'use client';

export function useApiKey() {
    // In a real app, this would come from secure storage or context
    // For now, we'll use the same key that's configured in the .env file
    return 'corpus-api-key-2024-secure-string';
}
