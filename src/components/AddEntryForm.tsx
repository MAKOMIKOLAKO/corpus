'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react';

export default function AddEntryForm() {
    const router = useRouter();
    const [tab, setTab] = useState<'DOI' | 'URL'>('DOI');
    const [fetchInput, setFetchInput] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                headers: { 'Content-Type': 'application/json' },
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
                contentType: data.contentType || prev.contentType,
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
                headers: { 'Content-Type': 'application/json' },
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
            const payload = {
                ...formData,
                authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
                userKeywords: formData.userKeywords.split(',').map(k => k.trim()).filter(Boolean),
            };

            const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to save entry');

            const saved = await res.json();
            router.push(`/entries/${saved.id}`);
        } catch (err: any) {
            setError(err.message);
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Fetch Section */}
            <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] shadow-sm">
                <div className="flex gap-6 mb-6 border-b border-[var(--border)]">
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

                <div className="flex gap-3">
                    <div className="relative flex-1">
                        {tab === 'DOI' ? <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" /> : <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />}
                        <input
                            type="text"
                            placeholder={tab === 'DOI' ? "Search 10.1038/nphys1170" : "https://example.com/article"}
                            value={fetchInput}
                            onChange={e => setFetchInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--border)] transition-all text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleFetch}
                        disabled={!fetchInput.trim() || isFetching}
                        className="bg-[var(--foreground)] text-[var(--background)] px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                    </button>
                </div>

                {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-md">{error}</div>}
            </div>

            {/* Editor Section */}
            <form onSubmit={handleSave} className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] shadow-sm space-y-6">
                <h3 className="font-semibold text-lg pb-4 border-b border-[var(--border)]">Entry Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">Title <span className="text-red-500">*</span></label>
                        <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">Authors (comma-separated)</label>
                        <input type="text" value={formData.authors} onChange={e => setFormData({ ...formData, authors: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">Source (Journal/Publisher)</label>
                        <input type="text" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]" />
                    </div>

                    <div className="space-y-1.5 flex gap-4 md:col-span-2">
                        <div className="w-1/3 space-y-1.5">
                            <label className="text-sm font-medium text-[var(--muted-foreground)]">Year</label>
                            <input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-sm font-medium text-[var(--muted-foreground)]">Content Type</label>
                            <select value={formData.contentType} onChange={e => setFormData({ ...formData, contentType: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]">
                                <option value="PAPER">Paper</option>
                                <option value="BLOG">Blog</option>
                                <option value="ESSAY">Essay</option>
                                <option value="ARTICLE">Article</option>
                                <option value="POLICY_REPORT">Policy Report</option>
                                <option value="BOOK">Book</option>
                                <option value="VIDEO">Video</option>
                                <option value="SOCIAL_POST">Social Post</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-sm font-medium text-[var(--muted-foreground)]">Status</label>
                            <select value={formData.readingStatus} onChange={e => setFormData({ ...formData, readingStatus: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]">
                                <option value="UNREAD">Unread</option>
                                <option value="READING">Reading</option>
                                <option value="READ">Read</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2 relative mt-2">
                        <div className="flex justify-between items-end pb-1">
                            <label className="text-sm font-medium text-[var(--muted-foreground)]">Abstract / Excerpt</label>
                            <button
                                type="button"
                                onClick={handleGenerateKeywords}
                                disabled={isGenerating || !formData.abstract}
                                className="text-[13px] flex items-center gap-1.5 text-[var(--foreground)] opacity-70 hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-opacity"
                            >
                                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                Generate Keywords
                            </button>
                        </div>
                        <textarea value={formData.abstract} onChange={e => setFormData({ ...formData, abstract: e.target.value })} rows={5} className="w-full px-3 py-3 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px] resize-y" />

                        {formData.autoKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {formData.autoKeywords.map((kw, i) => (
                                    <span key={i} className="text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] px-2 py-1 rounded-md flex items-center gap-1">
                                        #{kw}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">Tags (comma-separated)</label>
                        <input type="text" value={formData.userKeywords} onChange={e => setFormData({ ...formData, userKeywords: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">URL</label>
                        <input type="url" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">DOI</label>
                        <input type="text" value={formData.doi} onChange={e => setFormData({ ...formData, doi: e.target.value })} className="w-full px-3 py-2 bg-[#f5f4f2] dark:bg-[#202020] border-transparent rounded-md focus:ring-2 focus:ring-[var(--border)] outline-none text-[15px]" />
                    </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-[var(--border)]">
                    <button type="button" onClick={() => router.back()} disabled={isSaving} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving || !formData.title.trim()} className="bg-[var(--foreground)] text-[var(--background)] px-6 py-2 rounded-md text-[15px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Entry
                    </button>
                </div>
            </form>
        </div>
    );
}
