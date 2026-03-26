'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, CheckCircle, AlertCircle, ArrowUpRight, Plus, Share, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useApiKey } from '@/hooks/useApiKey';

interface PaperMetadata {
    title: string | null;
    authors: string[];
    year: number | null;
    abstract: string | null;
    source: string | null;
    doi: string | null;
    url: string | null;
    openAccessUrl: string | null;
    contentType: 'PAPER';
    duplicate?: {
        id: string;
        title: string;
        createdAt: string;
    } | null;
    metadataSources: string[];
}

interface SearchResult {
    semanticScholarId: string;
    title: string;
    authors: string[];
    year: number | null;
    abstract: string | null;
    source: string | null;
    doi: string | null;
    openAccessUrl: string | null;
}

type Mode = 'search' | 'doi';
type ReadingStatus = 'UNREAD' | 'READING' | 'READ';

export default function AddPaperForm() {
    const router = useRouter();
    const apiKey = useApiKey();

    // UI state
    const [mode, setMode] = useState<Mode>('search');
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // DOI input state
    const [doiInput, setDoiInput] = useState('');
    const [isFetchingDoi, setIsFetchingDoi] = useState(false);
    const [doiError, setDoiError] = useState<string | null>(null);

    // Form state
    const [selectedPaper, setSelectedPaper] = useState<PaperMetadata | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        authors: '',
        year: '',
        abstract: '',
        source: '',
        doi: '',
        url: '',
        notes: '',
        readingStatus: 'UNREAD' as ReadingStatus
    });

    // Post-save state
    const [isSaved, setIsSaved] = useState(false);
    const [savedEntryId, setSavedEntryId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);
    const [addedToCollections, setAddedToCollections] = useState<Set<string>>(new Set());
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(true);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search when debounced query changes
    useEffect(() => {
        if (mode === 'search' && debouncedQuery.length >= 3) {
            handleSearch(debouncedQuery);
        } else if (debouncedQuery.length < 3) {
            setSearchResults([]);
            setSearchError(null);
        }
    }, [debouncedQuery, mode]);

    const handleSearch = async (query: string) => {
        setIsSearching(true);
        setSearchError(null);

        try {
            const response = await fetch(`/api/papers/search?q=${encodeURIComponent(query)}&limit=8`);
            const data = await response.json();

            if (response.ok) {
                setSearchResults(data.results || []);
                if (data.error) {
                    setSearchError(data.error);
                }
            } else {
                setSearchError(data.error || 'Search failed');
            }
        } catch (error) {
            setSearchError('Search unavailable');
        } finally {
            setIsSearching(false);
        }
    };

    const handleDoiLookup = async () => {
        if (!doiInput.trim()) return;

        setIsFetchingDoi(true);
        setDoiError(null);

        try {
            const response = await fetch('/api/papers/doi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ doi: doiInput })
            });

            const data = await response.json();

            if (response.ok) {
                handlePaperSelect(data);
            } else {
                setDoiError(data.error || 'Failed to fetch DOI');
            }
        } catch (error) {
            setDoiError('Failed to fetch DOI');
        } finally {
            setIsFetchingDoi(false);
        }
    };

    const handlePaperSelect = (paper: PaperMetadata | SearchResult) => {
        // If it's a search result, we need to fetch full metadata
        if ('semanticScholarId' in paper) {
            // For now, use the search result data directly
            // In a more complete implementation, we might want to fetch full details
            const metadata: PaperMetadata = {
                title: paper.title,
                authors: paper.authors,
                year: paper.year,
                abstract: paper.abstract,
                source: paper.source,
                doi: paper.doi,
                url: paper.doi ? `https://doi.org/${paper.doi}` : null,
                openAccessUrl: paper.openAccessUrl,
                contentType: 'PAPER',
                metadataSources: ['Semantic Scholar']
            };
            setSelectedPaper(metadata);
            populateForm(metadata);
        } else {
            setSelectedPaper(paper);
            populateForm(paper);
        }
    };

    const populateForm = (metadata: PaperMetadata) => {
        setFormData({
            title: metadata.title || '',
            authors: metadata.authors.join(', '),
            year: metadata.year?.toString() || '',
            abstract: metadata.abstract || '',
            source: metadata.source || '',
            doi: metadata.doi || '',
            url: metadata.url || '',
            notes: '',
            readingStatus: 'UNREAD'
        });
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch('/api/papers/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    title: formData.title,
                    authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
                    year: formData.year ? parseInt(formData.year) : null,
                    abstract: formData.abstract || null,
                    source: formData.source || null,
                    doi: formData.doi || null,
                    url: formData.url || null,
                    readingStatus: formData.readingStatus,
                    notes: formData.notes
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSavedEntryId(data.id);
                setIsSaved(true);
                loadCollections();
            } else {
                alert(data.error || 'Failed to save paper');
            }
        } catch (error) {
            alert('Failed to save paper');
        } finally {
            setIsSaving(false);
        }
    };

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

    const handleAddAnother = () => {
        setSelectedPaper(null);
        setSearchQuery('');
        setSearchResults([]);
        setDoiInput('');
        setFormData({
            title: '',
            authors: '',
            year: '',
            abstract: '',
            source: '',
            doi: '',
            url: '',
            notes: '',
            readingStatus: 'UNREAD'
        });
        setIsSaved(false);
        setSavedEntryId('');
        setShowCollectionsDropdown(false);
        setAddedToCollections(new Set());
    };

    // If saved, show confirmation
    if (isSaved) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <h2 className="text-xl font-semibold">Saved to your library</h2>
                        <p className="text-sm text-muted-foreground">{formData.title}</p>

                        <div className="flex justify-center gap-2 pt-4">
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
        );
    }

    // If a paper is selected, show the preview form
    if (selectedPaper) {
        return (
            <div className="space-y-6">
                {/* Back button */}
                <Button
                    variant="ghost"
                    onClick={() => {
                        setSelectedPaper(null);
                        setShowDuplicateWarning(true);
                    }}
                    className="gap-2"
                >
                    ← Search again
                </Button>

                {/* Duplicate warning */}
                {selectedPaper.duplicate && showDuplicateWarning && (
                    <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
                        <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm">
                                        This paper is already in your library (saved {new Date(selectedPaper.duplicate.createdAt).toLocaleDateString()}).
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/entries/${selectedPaper.duplicate?.id}`)}
                                        >
                                            View existing entry →
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowDuplicateWarning(false)}
                                        >
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Preview form */}
                <Card>
                    <CardHeader>
                        {/* Metadata source badges */}
                        <div className="flex flex-wrap gap-2">
                            {selectedPaper.metadataSources.map((source, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    {source}
                                </Badge>
                            ))}
                            {selectedPaper.openAccessUrl && (
                                <Badge key="oa" variant="outline" className="text-xs text-green-600">
                                    Open Access available
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Always visible fields */}
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

                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <Label>Year</Label>
                                    <Input
                                        type="number"
                                        value={formData.year}
                                        onChange={e => setFormData({ ...formData, year: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label>Reading Status</Label>
                                    <Select value={formData.readingStatus} onValueChange={(value: ReadingStatus | null) => setFormData({ ...formData, readingStatus: value || 'UNREAD' })}>
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

                            <div>
                                <Label>Abstract</Label>
                                <Textarea
                                    value={formData.abstract}
                                    onChange={e => setFormData({ ...formData, abstract: e.target.value })}
                                    rows={5}
                                    placeholder={!formData.abstract ? "No abstract found — add one manually or leave blank" : ""}
                                />
                            </div>

                            {selectedPaper.openAccessUrl && (
                                <div className="text-sm">
                                    <a
                                        href={selectedPaper.openAccessUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-green-600 hover:underline"
                                    >
                                        Free full text available →
                                        <ArrowUpRight className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Collapsible more details */}
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between">
                                    More details
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-4">
                                <div>
                                    <Label>Source / Journal</Label>
                                    <Input
                                        value={formData.source}
                                        onChange={e => setFormData({ ...formData, source: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>DOI</Label>
                                    <Input
                                        value={formData.doi}
                                        readOnly={!!selectedPaper.doi}
                                        className={selectedPaper.doi ? 'bg-muted' : ''}
                                    />
                                </div>

                                <div>
                                    <Label>Personal Notes</Label>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        placeholder="Add your notes about this paper..."
                                    />
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <Button
                            onClick={handleSave}
                            className="w-full"
                            disabled={!formData.title.trim() || isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save to Library'
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main search/DOI input UI
    return (
        <div className="space-y-6">
            {/* Mode toggle buttons */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${mode === 'search'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setMode('search')}
                >
                    Search by Title
                </button>
                <button
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${mode === 'doi'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setMode('doi')}
                >
                    Enter DOI
                </button>
            </div>

            {/* Search by Title mode */}
            {mode === 'search' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search for a paper by title or keywords..."
                                    className="pl-10"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {/* Search results */}
                            {searchResults.length > 0 && (
                                <div className="space-y-3">
                                    {searchResults.map((result, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handlePaperSelect(result)}
                                            className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                        >
                                            <h4 className="font-medium">{result.title}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {result.authors.slice(0, 3).join(', ')}
                                                {result.authors.length > 3 && ' et al.'}
                                                {result.year && ` · ${result.year}`}
                                                {result.source && ` · ${result.source}`}
                                            </p>
                                            {result.abstract && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {result.abstract.substring(0, 120)}
                                                    {result.abstract.length > 120 && '...'}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                {result.openAccessUrl && (
                                                    <Badge variant="secondary" className="text-xs text-green-600">
                                                        Open Access
                                                    </Badge>
                                                )}
                                                {result.doi && (
                                                    <span className="text-xs text-muted-foreground">
                                                        DOI: {result.doi}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* No results */}
                            {searchQuery.length >= 3 && !isSearching && searchResults.length === 0 && !searchError && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No papers found for that search. Try different keywords or switch to DOI lookup.
                                </p>
                            )}

                            {/* Error state */}
                            {searchError && (
                                <p className="text-sm text-destructive text-center py-4">
                                    {searchError}. Try entering a DOI instead.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* DOI Entry mode */}
            {mode === 'doi' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Input
                                        value={doiInput}
                                        onChange={e => setDoiInput(e.target.value)}
                                        placeholder="10.1038/nature12345"
                                        onKeyDown={e => e.key === 'Enter' && handleDoiLookup()}
                                    />
                                </div>
                                <Button
                                    onClick={handleDoiLookup}
                                    disabled={!doiInput.trim() || isFetchingDoi}
                                >
                                    {isFetchingDoi ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Looking Up
                                        </>
                                    ) : (
                                        'Look Up'
                                    )}
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Paste just the DOI — no need to include https://doi.org/
                            </p>

                            {/* DOI error */}
                            {doiError && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                                    {doiError.includes('format') ? (
                                        "That doesn't look like a valid DOI. DOIs start with 10."
                                    ) : (
                                        doiError
                                    )}
                                </div>
                            )}

                            {/* Loading state */}
                            {isFetchingDoi && (
                                <p className="text-sm text-muted-foreground text-center">
                                    Fetching paper metadata...
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
