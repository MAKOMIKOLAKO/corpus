'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, CheckCircle, AlertCircle, BookOpen, ArrowUpRight, Plus, Share, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useApiKey } from '@/hooks/useApiKey';
import { createEntryWithMetadata } from '@/lib/entryCreation';

type LoadingStep = 'detecting' | 'fetching' | 'checking_oa' | 'finalizing';
type InputType = 'doi' | 'arxiv' | 'pubmed' | 'url' | 'citation' | 'title' | '';

interface PaperMetadata {
    title: string | null;
    authors: string[];
    year: number | null;
    abstract: string | null;
    source: string | null;
    doi: string | null;
    url: string | null;
    pdfUrl?: string | null;
    openAccessUrl?: string | null;
    contentType: 'PAPER';
}

interface DuplicateEntry {
    id: string;
    title: string;
    createdAt: string;
}

interface Candidate {
    doi: string;
    title: string;
    authors: string[];
    year: number | null;
    source: string | null;
}

export default function AddPaperForm() {
    const router = useRouter();
    const apiKey = useApiKey();

    // Input and detection
    const [input, setInput] = useState('');
    const [detectedType, setDetectedType] = useState<InputType>('');
    const [isDetecting, setIsDetecting] = useState(false);

    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState<LoadingStep>('detecting');
    const [loadingMessage, setLoadingMessage] = useState('');

    // Results
    const [metadata, setMetadata] = useState<PaperMetadata | null>(null);
    const [source, setSource] = useState<string>('');
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [showCandidates, setShowCandidates] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        authors: '',
        year: '',
        abstract: '',
        source: '',
        doi: '',
        url: '',
        openAccessUrl: '',
        userKeywords: '',
        summary: '',
        notes: '',
        readingStatus: 'BACKLOG' as const
    });

    // UI states
    const [error, setError] = useState<string | null>(null);
    const [duplicate, setDuplicate] = useState<DuplicateEntry | null>(null);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [savedEntryId, setSavedEntryId] = useState<string>('');
    const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);
    const [addedToCollections, setAddedToCollections] = useState<Set<string>>(new Set());

    // Abstract expansion
    const [showFullAbstract, setShowFullAbstract] = useState(false);

    // Detect input type as user types
    useEffect(() => {
        if (!input.trim()) {
            setDetectedType('');
            return;
        }

        const timer = setTimeout(() => {
            const clean = input.trim();

            // DOI detection
            if (/^10\.\d{4,}[\/.].+$/.test(clean.replace(/^(doi:|DOI:|https?:\/\/(dx\.)?doi\.org\/)/, ''))) {
                setDetectedType('doi');
                return;
            }

            // ArXiv detection
            if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(clean) || /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(v\d+)?)/.test(clean)) {
                setDetectedType('arxiv');
                return;
            }

            // PubMed detection
            if (/^\d{6,8}$/.test(clean) || /pubmed\.ncbi\.nlm\.nih\.gov\/(?:entry\/)?(\d+)/.test(clean)) {
                setDetectedType('pubmed');
                return;
            }

            // URL detection
            if (/^https?:\/\//.test(clean)) {
                setDetectedType('url');
                return;
            }

            // Citation detection
            if (clean.length > 40 && (/\(\d{4}\)/.test(clean) || /et\s+al\./i.test(clean))) {
                setDetectedType('citation');
                return;
            }

            // Default to title search
            setDetectedType('title');
        }, 300);

        return () => clearTimeout(timer);
    }, [input]);

    // Loading messages
    useEffect(() => {
        const messages: Record<LoadingStep, string> = {
            detecting: 'Detecting input type...',
            fetching: `Fetching from ${source === 'crossref' ? 'CrossRef' : source === 'arxiv' ? 'ArXiv' : source === 'pubmed' ? 'PubMed' : 'source'}...`,
            checking_oa: 'Checking for open access version...',
            finalizing: 'Almost done...'
        };
        setLoadingMessage(messages[loadingStep]);
    }, [loadingStep, source]);

    // Simulate loading steps
    useEffect(() => {
        if (!isLoading) return;

        const steps: LoadingStep[] = ['detecting', 'fetching'];
        if (source.includes('unpaywall')) {
            steps.push('checking_oa');
        }
        steps.push('finalizing');

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            if (currentStep < steps.length) {
                setLoadingStep(steps[currentStep]);
            } else {
                clearInterval(interval);
            }
        }, 800);

        return () => clearInterval(interval);
    }, [isLoading, source]);

    // Handle form submission
    const handleSubmit = async () => {
        if (!input.trim()) return;

        setIsLoading(true);
        setError(null);
        setDuplicate(null);
        setShowCandidates(false);

        try {
            // Fetch metadata
            const response = await fetch('/api/papers/detect-and-fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ input })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch metadata');
            }

            if (data.responseType === 'candidates') {
                setCandidates(data.candidates);
                setShowCandidates(true);
                setIsLoading(false);
                return;
            }

            // Check for duplicates
            const duplicateResponse = await fetch(
                `/api/papers/check-duplicate?doi=${encodeURIComponent(data.metadata.doi || '')}&title=${encodeURIComponent(data.metadata.title || '')}`,
                {
                    headers: { 'x-api-key': apiKey }
                }
            );

            if (duplicateResponse.ok) {
                const duplicateData = await duplicateResponse.json();
                if (duplicateData.exists) {
                    setDuplicate(duplicateData.entry);
                }
            }

            // Set metadata and form data
            setMetadata(data.metadata);
            setSource(data.source);
            setFormData({
                title: data.metadata.title || '',
                authors: data.metadata.authors?.join(', ') || '',
                year: data.metadata.year?.toString() || '',
                abstract: data.metadata.abstract || '',
                source: data.metadata.source || '',
                doi: data.metadata.doi || '',
                url: data.metadata.url || '',
                openAccessUrl: data.metadata.openAccessUrl || '',
                userKeywords: '',
                summary: '',
                notes: '',
                readingStatus: 'BACKLOG'
            });

        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle candidate selection
    const handleCandidateSelect = async (candidate: Candidate) => {
        if (!candidate.doi) return;

        setIsLoading(true);
        setSource('crossref');

        try {
            const response = await fetch('/api/papers/detect-and-fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ input: candidate.doi })
            });

            const data = await response.json();

            if (!response.ok || data.responseType === 'candidates') {
                throw new Error('Failed to fetch candidate metadata');
            }

            setMetadata(data.metadata);
            setFormData({
                title: data.metadata.title || '',
                authors: data.metadata.authors?.join(', ') || '',
                year: data.metadata.year?.toString() || '',
                abstract: data.metadata.abstract || '',
                source: data.metadata.source || '',
                doi: data.metadata.doi || '',
                url: data.metadata.url || '',
                openAccessUrl: data.metadata.openAccessUrl || '',
                userKeywords: '',
                summary: '',
                notes: '',
                readingStatus: 'BACKLOG'
            });

            setShowCandidates(false);

        } catch (err: any) {
            setError(err.message || 'Failed to fetch candidate metadata');
        } finally {
            setIsLoading(false);
        }
    };

    // Save entry
    const handleSave = async () => {
        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }

        try {
            const result = await createEntryWithMetadata(
                formData.url || input,
                {
                    title: formData.title,
                    authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
                    year: formData.year ? parseInt(formData.year) : undefined,
                    contentType: 'PAPER',
                    url: formData.url,
                    doi: formData.doi,
                    source: formData.source,
                    abstract: formData.abstract,
                    userKeywords: formData.userKeywords,
                    summary: formData.summary,
                    notes: formData.notes ? [formData.notes] : [],
                    readingStatus: formData.readingStatus,
                    publishDate: '',
                    metadata: {
                        pdfUrl: metadata?.pdfUrl,
                        openAccessUrl: metadata?.openAccessUrl
                    }
                },
                apiKey,
                true // Skip AI generation for papers
            );

            if (result.success && result.entry?.id) {
                setSavedEntryId(result.entry.id);
                setIsSaved(true);

                // Load collections for the dropdown
                loadCollections();
            } else {
                setError(result.error || 'Failed to save entry');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save entry');
        }
    };

    // Load user collections
    const loadCollections = async () => {
        try {
            const response = await fetch('/api/collections', {
                headers: { 'x-api-key': apiKey }
            });

            if (response.ok) {
                const data = await response.json();
                setCollections(data);
            }
        } catch (error) {
            console.error('Failed to load collections:', error);
        }
    };

    // Add to collection
    const handleAddToCollection = async (collectionId: string) => {
        try {
            const response = await fetch(`/api/collections/${collectionId}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ entryId: savedEntryId })
            });

            if (response.ok) {
                setAddedToCollections(prev => new Set(prev).add(collectionId));
            }
        } catch (error) {
            console.error('Failed to add to collection:', error);
        }
    };

    // Reset form
    const handleAddAnother = () => {
        setInput('');
        setDetectedType('');
        setMetadata(null);
        setSource('');
        setCandidates([]);
        setShowCandidates(false);
        setFormData({
            title: '',
            authors: '',
            year: '',
            abstract: '',
            source: '',
            doi: '',
            url: '',
            openAccessUrl: '',
            userKeywords: '',
            summary: '',
            notes: '',
            readingStatus: 'BACKLOG'
        });
        setError(null);
        setDuplicate(null);
        setIsSaved(false);
        setSavedEntryId('');
        setShowCollectionsDropdown(false);
        setAddedToCollections(new Set());
    };

    // If saved, show confirmation
    if (isSaved) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                            <h2 className="text-xl font-semibold">Saved to your library</h2>
                            <p className="text-sm text-muted-foreground">{formData.title}</p>

                            <div className="flex justify-center gap-2 pt-4">
                                {/* Add to Collection Dropdown */}
                                <div className="relative">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowCollectionsDropdown(!showCollectionsDropdown)}
                                        className="gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add to Collection
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>

                                    {showCollectionsDropdown && collections.length > 0 && (
                                        <div className="absolute top-full mt-1 w-64 bg-popover border rounded-md shadow-lg z-10">
                                            <div className="p-2">
                                                {collections.map(collection => (
                                                    <button
                                                        key={collection.id}
                                                        onClick={() => handleAddToCollection(collection.id)}
                                                        disabled={addedToCollections.has(collection.id)}
                                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {collection.name}
                                                        {addedToCollections.has(collection.id) && (
                                                            <span className="ml-2 text-xs text-green-600">Added!</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button variant="outline" onClick={() => router.push(`/entries/${savedEntryId}`)}>
                                    View Entry
                                    <ArrowUpRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>

                            <button
                                onClick={handleAddAnother}
                                className="text-sm text-primary hover:underline"
                            >
                                Add another paper
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Universal Input Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Add Academic Paper</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Paste a DOI, ArXiv ID, PubMed ID, URL, or citation..."
                                className="pl-10 pr-32"
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            />
                            {detectedType && (
                                <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                                    {detectedType === 'doi' && 'DOI detected'}
                                    {detectedType === 'arxiv' && 'ArXiv ID'}
                                    {detectedType === 'pubmed' && 'PubMed ID'}
                                    {detectedType === 'url' && 'URL'}
                                    {detectedType === 'citation' && 'Citation string'}
                                    {detectedType === 'title' && 'Title search'}
                                </Badge>
                            )}
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={!input.trim() || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {loadingMessage}
                                </>
                            ) : (
                                'Find Paper'
                            )}
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        DOI: 10.1038/nature12345  ·  ArXiv: 2301.07041  ·  PubMed: 12345678  ·  URL: arxiv.org/abs/...  ·  Citation: paste any reference string
                    </p>

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Candidates UI */}
            {showCandidates && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select the paper you meant:</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {candidates.map((candidate, index) => (
                            <div
                                key={index}
                                onClick={() => handleCandidateSelect(candidate)}
                                className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                            >
                                <h4 className="font-medium">{candidate.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {candidate.authors.slice(0, 3).join(', ')}
                                    {candidate.authors.length > 3 && ' et al.'}
                                    {candidate.year && ` (${candidate.year})`}
                                </p>
                                {candidate.source && (
                                    <p className="text-xs text-muted-foreground">{candidate.source}</p>
                                )}
                            </div>
                        ))}

                        <div className="pt-2">
                            <Input
                                placeholder="Not what you were looking for? Refine search..."
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        const query = e.currentTarget.value;
                                        if (!query) return;

                                        try {
                                            const response = await fetch(`/api/papers/search-crossref?q=${encodeURIComponent(query)}`, {
                                                headers: { 'x-api-key': apiKey }
                                            });
                                            const data = await response.json();
                                            if (data.candidates) {
                                                setCandidates(data.candidates);
                                            }
                                        } catch (error) {
                                            console.error('Search error:', error);
                                        }
                                    }
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Duplicate Warning */}
            {duplicate && showDuplicateWarning && (
                <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm">
                                    You saved this paper on {new Date(duplicate.createdAt).toLocaleDateString()}.
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => router.push(`/entries/${duplicate.id}`)}
                                    >
                                        View existing entry →
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowDuplicateWarning(false)}
                                    >
                                        Continue anyway
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Preview Form */}
            {metadata && !showCandidates && (
                <Card>
                    <CardHeader>
                        {/* Source badges */}
                        <div className="flex flex-wrap gap-2">
                            {source.split(' + ').map((s, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    Metadata from {s === 'crossref' ? 'CrossRef' : s === 'semantic_scholar' ? 'Semantic Scholar' : s === 'unpaywall' ? 'Unpaywall' : s}
                                </Badge>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Section 1 - Always visible */}
                        <div className="space-y-4">
                            <div>
                                <Label>Title *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label>Authors</Label>
                                <Input
                                    value={formData.authors}
                                    onChange={e => setFormData({ ...formData, authors: e.target.value })}
                                    placeholder="Author One, Author Two, Author Three"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Year</Label>
                                    <Input
                                        type="number"
                                        value={formData.year}
                                        onChange={e => setFormData({ ...formData, year: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Reading Status</Label>
                                    <Select value={formData.readingStatus} onValueChange={(value: any) => setFormData({ ...formData, readingStatus: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BACKLOG">Backlog</SelectItem>
                                            <SelectItem value="READING">Reading</SelectItem>
                                            <SelectItem value="READ">Read</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formData.abstract && (
                                <div>
                                    <Label>Abstract</Label>
                                    <div className="relative">
                                        <Textarea
                                            value={formData.abstract}
                                            onChange={e => setFormData({ ...formData, abstract: e.target.value })}
                                            className={!showFullAbstract && formData.abstract.length > 300 ? 'h-24' : 'h-32'}
                                        />
                                        {!showFullAbstract && formData.abstract.length > 300 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowFullAbstract(true)}
                                                className="text-xs text-primary hover:underline mt-1"
                                            >
                                                Show more
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 2 - Collapsible */}
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between">
                                    Additional details
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-4">
                                <div>
                                    <Label>Source/Journal</Label>
                                    <Input
                                        value={formData.source}
                                        onChange={e => setFormData({ ...formData, source: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>DOI</Label>
                                    <Input
                                        value={formData.doi}
                                        onChange={e => setFormData({ ...formData, doi: e.target.value })}
                                        placeholder="10.1000/xyz123"
                                    />
                                </div>

                                <div>
                                    <Label>URL</Label>
                                    <Input
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    />
                                </div>

                                {formData.openAccessUrl && (
                                    <div>
                                        <Label>Open Access</Label>
                                        <a
                                            href={formData.openAccessUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                                        >
                                            Free PDF available →
                                            <ArrowUpRight className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}

                                <div>
                                    <Label>User Keywords</Label>
                                    <Input
                                        value={formData.userKeywords}
                                        onChange={e => setFormData({ ...formData, userKeywords: e.target.value })}
                                        placeholder="keyword1, keyword2, keyword3"
                                    />
                                </div>

                                <div>
                                    <Label>Summary</Label>
                                    <Textarea
                                        value={formData.summary}
                                        onChange={e => setFormData({ ...formData, summary: e.target.value })}
                                        placeholder="Your summary or notes about this paper..."
                                    />
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <Button onClick={handleSave} className="w-full">
                            Save to Library
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
