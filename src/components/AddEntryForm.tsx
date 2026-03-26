'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link as LinkIcon, Sparkles, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiKey } from '@/hooks/useApiKey';
import { createEntryWithMetadata } from '@/lib/entryCreation';
import UpgradeBanner from '@/components/UpgradeBanner';
import { useEntryQueue } from '@/hooks/useEntryQueue';
import QueuedEntriesDisplay from '@/components/QueuedEntriesDisplay';
import AddPaperForm from '@/components/AddPaperForm';

export default function AddEntryForm() {
    const router = useRouter();
    const apiKey = useApiKey();
    const [tab, setTab] = useState<'PAPER' | 'URL'>('PAPER');
    const [fetchInput, setFetchInput] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingDuplicate, setExistingDuplicate] = useState<any | null>(null);
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

    const entryQueue = useEntryQueue({
        apiKey,
        onSuccess: (item, entryId) => {
            console.log(`Entry "${item.metadata.title}" added successfully with ID: ${entryId}`);
        },
        onError: (item, error) => {
            console.error(`Failed to add entry "${item.metadata.title}": ${error}`);
        },
        onQueueComplete: () => {
            console.log('Queue processing complete');
        }
    });

    const [formData, setFormData] = useState({
        title: '',
        authors: '',
        year: '',
        publishDate: '',
        contentType: 'PAPER',
        url: '',
        doi: '',
        source: '',
        abstract: '',
        summary: '',
        userKeywords: '',
        autoKeywords: [] as string[],
        readingStatus: 'UNREAD',
    });

    const handleFetch = async () => {
        if (!fetchInput.trim()) return;
        setIsFetching(true);
        setError(null);
        try {
            const endpoint = '/api/fetch-academic-metadata';
            const body = { url: fetchInput };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch metadata');
            }

            const data = await res.json();

            setFormData(prev => ({
                ...prev,
                title: data.title || '',
                authors: Array.isArray(data.authors) ? data.authors.join(', ') : '',
                year: data.year != null ? String(data.year) : '',
                publishDate: data.publishDate ? String(data.publishDate) : '',
                source: data.source || '',
                abstract: data.abstract || '',
                url: tab === 'URL' ? fetchInput : (data.url || ''),
                doi: tab === 'DOI' ? fetchInput : (data.doi || ''),
                contentType: 'PAPER',
                autoKeywords: data.autoKeywords || [],
            }));
        } catch (err: any) {
            setError(err.message || 'An error occurred during fetch');
        } finally {
            setIsFetching(false);
        }
    };

    const handleGenerateKeywords = async () => {
        const textToAnalyze = formData.abstract || formData.summary;
        if (!textToAnalyze) {
            setError('Please provide an abstract or summary to generate keywords.');
            return;
        }

        setIsGenerating(true);
        setError(null);
        try {
            const res = await fetch('/api/keywords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ text: textToAnalyze }),
            });

            if (!res.ok) throw new Error('Failed to generate keywords');

            const data = await res.json();
            if (data.keywords) {
                setFormData(prev => ({ ...prev, autoKeywords: data.keywords }));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }

        const metadata = {
            title: formData.title,
            authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
            year: formData.year ? parseInt(formData.year, 10) : undefined,
            publishDate: formData.publishDate || undefined,
            contentType: formData.contentType,
            url: formData.url,
            doi: formData.doi,
            source: formData.source,
            abstract: formData.abstract,
        };

        const url = formData.url || `https://doi.org/${formData.doi}`;

        // Add to queue and reset form for next entry
        entryQueue.addToQueue(url, metadata);

        // Reset form for quick consecutive entries
        setFormData({
            title: '',
            authors: '',
            year: '',
            publishDate: '',
            contentType: 'PAPER',
            url: '',
            doi: '',
            source: '',
            abstract: '',
            summary: '',
            userKeywords: '',
            autoKeywords: [] as string[],
            readingStatus: 'UNREAD',
        });
        setFetchInput('');
    };

    // Auto-generate keywords when abstract changes
    useEffect(() => {
        const textToAnalyze = formData.abstract || formData.summary;
        if (textToAnalyze && textToAnalyze.length > 50) {
            const generateKeywords = async () => {
                try {
                    const res = await fetch('/api/keywords', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey
                        },
                        body: JSON.stringify({ text: textToAnalyze }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.keywords) {
                            setFormData(prev => ({ ...prev, autoKeywords: data.keywords }));
                        }
                    }
                } catch (err) {
                    console.error('Auto-generate keywords error:', err);
                }
            };

            // Debounce the keyword generation
            const timeoutId = setTimeout(generateKeywords, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [formData.abstract, formData.summary, apiKey]);

    return (
        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Upgrade Banner for Entry Limit */}
            {showUpgradeBanner && (
                <UpgradeBanner
                    message="You've reached the 100 entry limit on the free plan. Upgrade to Pro for unlimited entries."
                    ctaText="Upgrade to Pro"
                />
            )}

            {/* Queue Display */}
            {entryQueue.queue.length > 0 && (
                <QueuedEntriesDisplay
                    queue={entryQueue.queue}
                    stats={entryQueue.stats}
                    onRemove={entryQueue.removeFromQueue}
                    onRetry={entryQueue.retryItem}
                    onClearCompleted={entryQueue.clearCompleted}
                    onClearAll={entryQueue.clearAll}
                />
            )}
            {/* Tab Navigation */}
            <Card>
                <CardHeader>
                    <CardTitle>Add New Entry</CardTitle>
                    <CardDescription>
                        Choose how you want to add content to your library.
                    </CardDescription>
                    <div className="flex gap-6 border-b border-[var(--border)] mt-4">
                        <button
                            type="button"
                            className={`font-medium text-[15px] pb-3 transition-colors relative ${tab === 'PAPER' ? 'text-[var(--foreground)] border-b-2 border-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                            onClick={() => { setTab('PAPER'); }}
                        >
                            <BookOpen className="inline w-4 h-4 mr-2" />
                            Academic Paper
                        </button>
                        <button
                            type="button"
                            className={`font-medium text-[15px] pb-3 transition-colors relative ${tab === 'URL' ? 'text-[var(--foreground)] border-b-2 border-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                            onClick={() => { setTab('URL'); setFetchInput(''); setError(null); }}
                        >
                            <LinkIcon className="inline w-4 h-4 mr-2" />
                            Article / Book / URL
                        </button>
                    </div>
                </CardHeader>
            </Card>
            {/* Tab Content */}
            {tab === 'PAPER' ? (
                <AddPaperForm />
            ) : (
                <>
                    {/* Fetch Section for URL/ISBN */}
                    <Card>
                        <CardContent>
                            <div className="flex gap-3 pt-6">
                                <div className="relative flex-1">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="https://example.com/article or ISBN: 978-0-262-03384-8"
                                        value={fetchInput}
                                        onChange={e => setFetchInput(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleFetch}
                                    disabled={!fetchInput.trim() || isFetching}
                                >
                                    {isFetching && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {isFetching ? 'Fetching...' : 'Fetch Metadata'}
                                </Button>
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-md">
                                    <div className="flex flex-col gap-2">
                                        <p className="font-medium">Error</p>
                                        <p>{error}</p>
                                        {existingDuplicate && (
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        router.push(`/entries/${existingDuplicate.id}`);
                                                    }}
                                                >
                                                    View Existing Entry
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setError(null);
                                                        setExistingDuplicate(null);
                                                    }}
                                                >
                                                    Continue Anyway
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <form onSubmit={handleSave}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Entry Details</CardTitle>
                                <CardDescription>Manually edit or complete the indexed information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Title <span className="text-red-500">*</span></Label>
                                        <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Authors (comma-separated)</Label>
                                        <Input value={formData.authors} onChange={e => setFormData({ ...formData, authors: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Source (Journal/Publisher)</Label>
                                        <Input value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 flex flex-wrap gap-4 md:col-span-2">
                                        <div className="w-1/3 min-w-[140px] space-y-2">
                                            <Label>Year</Label>
                                            <Input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} />
                                        </div>
                                        <div className="min-w-[200px] flex-1 space-y-2">
                                            <Label>Publish date</Label>
                                            <Input
                                                placeholder="e.g. ISO date from source"
                                                value={formData.publishDate}
                                                onChange={e => setFormData({ ...formData, publishDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Label>Content Type</Label>
                                            <Select value={formData.contentType} onValueChange={v => setFormData({ ...formData, contentType: v || '' })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PAPER">Paper</SelectItem>
                                                    <SelectItem value="BOOK">Book</SelectItem>
                                                    <SelectItem value="ARTICLE">Article</SelectItem>
                                                    <SelectItem value="ESSAY">Essay</SelectItem>
                                                    <SelectItem value="POLICY_REPORT">Policy Report</SelectItem>
                                                    <SelectItem value="OTHER">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Label>Status</Label>
                                            <Select value={formData.readingStatus} onValueChange={v => setFormData({ ...formData, readingStatus: v || '' })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UNREAD">Unread</SelectItem>
                                                    <SelectItem value="READING">Reading</SelectItem>
                                                    <SelectItem value="READ">Read</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:col-span-2 relative mt-4">
                                        <div className="pb-1">
                                            <Label>Abstract / Excerpt</Label>
                                        </div>
                                        <Textarea value={formData.abstract} onChange={e => setFormData({ ...formData, abstract: e.target.value })} rows={5} className="resize-y" />

                                        {formData.autoKeywords.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {formData.autoKeywords.map((kw, i) => (
                                                    <span key={i} className="text-xs bg-background border border-border text-muted-foreground px-2 py-1 rounded-md flex items-center gap-1">
                                                        #{kw}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Tags (comma-separated)</Label>
                                        <Input value={formData.userKeywords} onChange={e => setFormData({ ...formData, userKeywords: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>URL</Label>
                                        <Input type="url" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>DOI</Label>
                                        <Input value={formData.doi} onChange={e => setFormData({ ...formData, doi: e.target.value })} />
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-end gap-3 border-t border-border">
                                    <Button variant="ghost" type="button" onClick={() => router.back()} disabled={isSaving}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSaving || !formData.title.trim()}>
                                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Add to Queue
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </>
            )}
        </div>
    );
}
