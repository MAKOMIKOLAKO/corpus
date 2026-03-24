'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApiKey } from '@/hooks/useApiKey';
import { createEntryWithMetadata } from '@/lib/entryCreation';

export default function QuickAddEntry() {
    const [url, setUrl] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const apiKey = useApiKey();

    const handleFetch = async () => {
        if (!url.trim()) return;

        setIsFetching(true);
        setError(null);
        setSuccess(false);

        try {
            // First, try to fetch metadata
            let metadata = {};
            try {
                const metadataResponse = await fetch('/api/fetch-metadata-ai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                    },
                    body: JSON.stringify({ url: url.trim() }),
                });

                if (metadataResponse.ok) {
                    metadata = await metadataResponse.json();
                }
            } catch (metadataError) {
                console.warn('Metadata fetch failed, proceeding with basic entry:', metadataError);
                // Continue with basic entry if metadata fails
            }

            // Use unified entry creation system
            const result = await createEntryWithMetadata(url, metadata, apiKey, false); // Keep AI generation for quick add

            if (result.success && result.entry?.id) {
                setSuccess(true);
                setUrl('');
                // Redirect to new entry after a short delay
                setTimeout(() => {
                    window.location.href = `/entries/${result.entry!.id}`;
                }, 1500);
            } else {
                // Check if it's a duplicate entry error
                if (result.error?.includes('duplicate') && result.existingEntry) {
                    const confidence = result.confidence || 'unknown';
                    const reason = result.reason || 'Duplicate detected';

                    if (confidence === 'high') {
                        setError(`exact duplicate found. redirecting to existing entry...`);
                    } else if (confidence === 'medium') {
                        setError(`possible duplicate (${reason}). redirecting to existing entry...`);
                    } else {
                        setError(`potential match found (${reason}). redirecting to existing entry...`);
                    }

                    setTimeout(() => {
                        window.location.href = `/entries/${result.existingEntry.id}`;
                    }, 2500);
                } else {
                    setError(result.error || 'failed to add entry. please try again.');
                }
            }
        } catch (err: any) {
            console.error('Quick add error:', err);
            setError(err.message || 'Failed to add entry. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFetch();
        }
    };

    return (
        <div className="glass-card p-5 rounded-xl border border-border/50">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">quick add entry</h3>
                        <p className="text-xs text-muted-foreground">paste a url to instantly add an entry</p>
                    </div>
                </div>

                {/* Input Section */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <input
                            type="url"
                            placeholder="paste url to add entry..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full h-10 pl-4 pr-4 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
                            disabled={isFetching}
                        />
                    </div>
                    <Button
                        onClick={handleFetch}
                        disabled={!url.trim() || isFetching || success}
                        size="sm"
                        className="h-10 px-4 rounded-lg font-medium transition-all"
                    >
                        {isFetching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : success ? (
                            <span className="text-green-600">✓</span>
                        ) : (
                            <span>add</span>
                        )}
                    </Button>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">!</span>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400">entry added successfully! redirecting...</p>
                    </div>
                )}

                {/* Help Text */}
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/30">
                    <div className="space-y-1">
                        <p>✨ supports articles, papers, blog posts, and more</p>
                        <p>🤖 automatically fetches metadata and generates keywords</p>
                        <p>📝 for advanced options, use the <a href="/add" className="text-primary hover:underline font-medium">dedicated add page</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
