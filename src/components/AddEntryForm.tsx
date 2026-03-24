'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiKey } from '@/hooks/useApiKey';
import { createEntryWithMetadata } from '@/lib/entryCreation';

export default function AddEntryForm() {
    const router = useRouter();
    const apiKey = useApiKey();
    const [tab, setTab] = useState<'DOI' | 'URL'>('DOI');
    const [fetchInput, setFetchInput] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingDuplicate, setExistingDuplicate] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        authors: '',
        year: '',
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
            const endpoint = '/api/fetch-metadata-ai';
            const body = tab === 'DOI' ? { doi: fetchInput } : { url: fetchInput };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                throw new Error('Failed to fetch metadata');
            }

            const data = await res.json();

            setFormData(prev => ({
                ...prev,
                title: data.title || '',
                authors: Array.isArray(data.authors) ? data.authors.join(', ') : '',
                year: data.year ? data.year.toString() : '',
                source: data.source || '',
                abstract: data.abstract || '',
                url: tab === 'URL' ? fetchInput : (data.url || ''),
                doi: tab === 'DOI' ? fetchInput : (data.doi || ''),
                contentType: data.contentType || prev.contentType || 'PAPER',
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
        setIsSaving(true);
        setError(null);

        try {
            // Prepare entry data
            const entryData = {
                ...formData,
                authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
                userKeywords: formData.userKeywords.split(',').map(k => k.trim()).filter(Boolean),
            };

            // Use unified entry creation system
            const result = await createEntryWithMetadata(
                tab === 'URL' ? formData.url : `https://doi.org/${formData.doi}`,
                {
                    title: formData.title,
                    authors: Array.isArray(formData.authors) ? formData.authors.split(',').map(a => a.trim()).filter(Boolean) : [],
                    year: formData.year ? parseInt(formData.year, 10) : undefined,
                    contentType: formData.contentType,
                    url: formData.url,
                    doi: formData.doi,
                    source: formData.source,
                    abstract: formData.abstract,
                },
                apiKey
            );

            if (result.success) {
                router.push(`/entries/${result.entry.id}`);
            } else {
                // Handle duplicate entries with enhanced messaging
                if (result.error?.includes('duplicate') && result.existingEntry) {
                    const confidence = result.confidence || 'unknown';
                    const reason = result.reason || 'Duplicate detected';
                    const existingTitle = result.existingEntry.title;

                    // Store the duplicate data for navigation
                    setExistingDuplicate(result.existingEntry);

                    if (confidence === 'high') {
                        setError(`exact duplicate found: "${existingTitle}". This entry already exists in your library.`);
                    } else if (confidence === 'medium') {
                        setError(`possible duplicate: "${existingTitle}" (${reason}). This entry may already exist.`);
                    } else {
                        setError(`potential match: "${existingTitle}" (${reason}). Please check if this entry already exists.`);
                    }
                } else {
                    setError(result.error || 'Failed to save entry');
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
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
        <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Fetch Section */}
            <Card>
                <CardHeader>
                    <div className="flex gap-6 border-b border-[var(--border)]">
                        <button
                            type="button"
                            className={`font-medium text-[15px] pb-3 transition-colors relative ${tab === 'DOI' ? 'text-[var(--foreground)] border-b-2 border-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                            onClick={() => { setTab('DOI'); setFetchInput(''); setError(null); }}
                        >
                            Fetch by DOI
                        </button>
                        <button
                            type="button"
                            className={`font-medium text-[15px] pb-3 transition-colors relative ${tab === 'URL' ? 'text-[var(--foreground)] border-b-2 border-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                            onClick={() => { setTab('URL'); setFetchInput(''); setError(null); }}
                        >
                            Fetch by URL
                        </button>
                    </div>
                </CardHeader>
                <CardContent>

                    <div className="flex gap-3 pt-2">
                        <div className="relative flex-1">
                            {tab === 'DOI' ? <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> : <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                            <Input
                                type="text"
                                placeholder={tab === 'DOI' ? "Search 10.1038/nphys1170" : "https://example.com/article"}
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
                            Fetch
                        </Button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-md">
                            <div className="flex flex-col gap-2">
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

            {/* Editor Section */}
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
                            <div className="space-y-2 flex gap-4 md:col-span-2">
                                <div className="w-1/3 space-y-2">
                                    <Label>Year</Label>
                                    <Input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label>Content Type</Label>
                                    <Select value={formData.contentType} onValueChange={v => setFormData({ ...formData, contentType: v || '' })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PAPER">Paper</SelectItem>
                                            <SelectItem value="BLOG">Blog</SelectItem>
                                            <SelectItem value="ESSAY">Essay</SelectItem>
                                            <SelectItem value="ARTICLE">Article</SelectItem>
                                            <SelectItem value="POLICY_REPORT">Policy Report</SelectItem>
                                            <SelectItem value="BOOK">Book</SelectItem>
                                            <SelectItem value="VIDEO">Video</SelectItem>
                                            <SelectItem value="SOCIAL_POST">Social Post</SelectItem>
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
                                Save Entry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
