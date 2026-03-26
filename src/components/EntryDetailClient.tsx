'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Edit2, ExternalLink, Trash2, ChevronLeft, Calendar, FileText, Globe, BookOpen, Share2, X } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
        return 'today';
    } else if (diffInDays === 1) {
        return 'yesterday';
    } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffInDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
    }
};

export default function EntryDetailClient({ initialData }: { initialData: any }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(initialData);

    const [newNote, setNewNote] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);

    // Collections state
    const [entryCollections, setEntryCollections] = useState([]);
    const [availableCollections, setAvailableCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');
    const [isAddingToCollection, setIsAddingToCollection] = useState(false);

    // Share state
    const [showShareModal, setShowShareModal] = useState(false);
    const [connections, setConnections] = useState<any[]>([]);
    const [shareReceiverId, setShareReceiverId] = useState('');
    const [shareMessage, setShareMessage] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [shareResult, setShareResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const apiKey = useApiKey();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleBack = () => {
        const from = searchParams.get('from');
        if (from) {
            // If we have a 'from' parameter, navigate back to that page
            router.push(from);
        } else {
            // Otherwise use browser back
            router.back();
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        try {
            const response = await fetch(`/api/entries/${initialData.id}`, {
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (response.ok) {
                router.push('/library');
            } else {
                const errorData = await response.json();
                console.error('Delete failed:', errorData);
                alert(`Failed to delete entry: ${errorData.error || 'Unknown error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to delete entry');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/entries/${initialData.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    title: formData.title,
                    authors: Array.isArray(formData.authors) ? formData.authors : formData.authors.split(',').map((a: string) => a.trim()),
                    year: parseInt(formData.year, 10) || null,
                    source: formData.source,
                    url: formData.url,
                    doi: formData.doi,
                    abstract: formData.abstract,
                    contentType: formData.contentType,
                    readingStatus: formData.readingStatus,
                    userKeywords: Array.isArray(formData.userKeywords) ? formData.userKeywords : formData.userKeywords.split(',').map((k: string) => k.trim()),
                }),
            });
            if (res.ok) {
                setIsEditing(false);
                router.refresh();
            } else {
                throw new Error('Failed to update');
            }
        } catch (e) {
            alert('Error saving changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsAddingNote(true);
        try {
            const res = await fetch(`/api/entries/${initialData.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    notes: { text: newNote }
                }),
            });
            if (res.ok) {
                const updated = await res.json();
                setFormData(updated);
                setNewNote('');
                router.refresh();
            }
        } catch (e) {
            alert('Error adding note');
        } finally {
            setIsAddingNote(false);
        }
    };

    // Collections handlers
    const handleAddToCollection = async () => {
        if (!selectedCollection) return;

        setIsAddingToCollection(true);
        try {
            const response = await fetch(`/api/collections/${selectedCollection}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({ entryId: initialData.id }),
            });

            if (response.ok) {
                setSelectedCollection('');
                fetchCollections();
            } else {
                const error = await response.json();
                alert(`Failed to add to collection: ${error.error}`);
            }
        } catch (error) {
            console.error('Error adding to collection:', error);
            alert('Failed to add to collection');
        } finally {
            setIsAddingToCollection(false);
        }
    };

    const handleRemoveFromCollection = async (collectionId: string) => {
        if (!confirm('Remove this entry from the collection?')) return;

        try {
            const response = await fetch(`/api/collections/${collectionId}/entries/${initialData.id}`, {
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (response.ok) {
                fetchCollections();
            } else {
                const error = await response.json();
                alert(`Failed to remove from collection: ${error.error}`);
            }
        } catch (error) {
            console.error('Error removing from collection:', error);
            alert('Failed to remove from collection');
        }
    };

    const fetchCollections = async () => {
        try {
            // Get all collections
            const collectionsResponse = await fetch('/api/collections');
            if (collectionsResponse.ok) {
                const allCollections = await collectionsResponse.json();
                setAvailableCollections(allCollections);
            }

            // Get entry's collections (this would need a new API endpoint or modify existing one)
            // For now, we'll simulate this
            setEntryCollections([]);
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const openShareModal = async () => {
        setShareResult(null);
        setShareReceiverId('');
        setShareMessage('');
        setShowShareModal(true);
        try {
            const res = await fetch('/api/connections');
            if (res.ok) {
                const data = await res.json();
                setConnections(data.accepted || []);
            }
        } catch { }
    };

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shareReceiverId) return;
        setIsSharing(true);
        setShareResult(null);
        try {
            const res = await fetch('/api/entries/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryId: initialData.id, receiverId: shareReceiverId, message: shareMessage }),
            });
            const data = await res.json();
            if (res.ok) {
                setShareResult({ type: 'success', text: 'Entry shared successfully!' });
                setShareReceiverId('');
                setShareMessage('');
            } else {
                setShareResult({ type: 'error', text: data.error || 'Failed to share entry' });
            }
        } finally {
            setIsSharing(false);
        }
    };

    const notesList = Array.isArray(formData.notes) ? formData.notes : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <button onClick={handleBack} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {isEditing ? (
                <div className="glass-card p-6 rounded-xl space-y-4 border border-[var(--primary)]/30 shadow-lg shadow-blue-500/5">
                    <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">Edit Entry</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Title</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Authors (comma-separated)</label>
                                <input type="text" value={Array.isArray(formData.authors) ? formData.authors.join(', ') : formData.authors} onChange={e => setFormData({ ...formData, authors: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Year</label>
                                <input type="number" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Content Type</label>
                                <select value={formData.contentType} onChange={e => setFormData({ ...formData, contentType: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md">
                                    <option value="PAPER">Paper</option>
                                    <option value="BLOG">Blog</option>
                                    <option value="ESSAY">Essay</option>
                                    <option value="ARTICLE">Article</option>
                                    <option value="POLICY_REPORT">Policy Report</option>
                                    <option value="BOOK">Book</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Reading Status</label>
                                <select value={formData.readingStatus} onChange={e => setFormData({ ...formData, readingStatus: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md">
                                    <option value="UNREAD">Unread</option>
                                    <option value="READING">Reading</option>
                                    <option value="READ">Read</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Source</label>
                            <input type="text" value={formData.source || ''} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Abstract</label>
                            <textarea value={formData.abstract || ''} onChange={e => setFormData({ ...formData, abstract: e.target.value })} rows={5} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">User Keywords (comma-separated)</label>
                            <input type="text" value={Array.isArray(formData.userKeywords) ? formData.userKeywords.join(', ') : formData.userKeywords} onChange={e => setFormData({ ...formData, userKeywords: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">URL</label>
                                <input type="text" value={formData.url || ''} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">DOI</label>
                                <input type="text" value={formData.doi || ''} onChange={e => setFormData({ ...formData, doi: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                            <button onClick={() => { setIsEditing(false); setFormData(initialData); }} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-[var(--muted)]">Cancel</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-[var(--primary)] text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col relative overflow-hidden border border-[var(--border)]">
                        <div className="absolute top-0 right-0 p-4 flex gap-2">
                            <button onClick={openShareModal} className="p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-md transition-colors" title="Share Entry">
                                <Share2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditing(true)} className="p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-md transition-colors" title="Edit Entry">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={handleDelete} className="p-2 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Delete Entry">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex gap-2 items-center mb-4 text-xs font-semibold tracking-wider">
                            <span className={`px-2.5 py-1 rounded bg-[var(--muted)] text-[var(--foreground)]`}>
                                {formData.contentType}
                            </span>
                            <span className={`px-2.5 py-1 rounded ${formData.readingStatus === 'READ' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                formData.readingStatus === 'READING' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                    'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                }`}>
                                {formData.readingStatus}
                            </span>
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2 pr-16">{formData.title}</h1>
                        <p className="text-lg text-[var(--muted-foreground)] mb-6 font-medium">
                            {Array.isArray(formData.authors) ? formData.authors.join(', ') : formData.authors}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-[var(--muted)]/30 p-4 rounded-xl border border-[var(--border)]/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                    <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase">added</span>
                                    <span className="font-medium text-sm">{formatDate(formData.createdAt)}</span>
                                </div>
                            </div>
                            {formData.year && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                        <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[var(--muted-foreground)] uppercase">year</span>
                                        <span className="font-medium text-sm">{formData.year}</span>
                                    </div>
                                </div>
                            )}
                            {formData.source && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                        <BookOpen className="w-4 h-4 text-[var(--muted-foreground)]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[var(--muted-foreground)] uppercase">Source</span>
                                        <span className="font-medium text-sm line-clamp-1">{formData.source}</span>
                                    </div>
                                </div>
                            )}
                            {formData.doi && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                        <FileText className="w-4 h-4 text-[var(--muted-foreground)]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[var(--muted-foreground)] uppercase">DOI</span>
                                        <a href={`https://doi.org/${formData.doi}`} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-[var(--primary)] hover:underline flex items-center gap-1 line-clamp-1">
                                            {formData.doi}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {formData.url && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                        <Globe className="w-4 h-4 text-[var(--muted-foreground)]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[var(--muted-foreground)] uppercase">Link</span>
                                        <a href={formData.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-[var(--primary)] hover:underline flex items-center gap-1 line-clamp-1">
                                            Open URL <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {formData.abstract && (
                            <div className="mb-6">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Abstract</h3>
                                <p className="text-[var(--foreground)] leading-relaxed text-sm md:text-base opacity-90">{formData.abstract}</p>
                            </div>
                        )}

                        {Array.isArray(formData.topics) && formData.topics.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--muted-foreground)] mb-3">topics</h3>
                                <div className="flex flex-wrap gap-2">
                                    {formData.topics.map((topic: string, i: number) => (
                                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 font-medium border border-blue-200 dark:border-blue-700">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(Array.isArray(formData.autoKeywords) && formData.autoKeywords.length > 0) || (Array.isArray(formData.userKeywords) && formData.userKeywords.length > 0) && (
                            <div className="pt-4 border-t border-[var(--border)]">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Keywords</h3>
                                <div className="flex flex-wrap gap-2">
                                    {Array.isArray(formData.userKeywords) && formData.userKeywords.map((kw: string, i: number) => (
                                        <span key={`user-${i}`} className="text-xs px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium border border-[var(--primary)]/20">
                                            {kw}
                                        </span>
                                    ))}
                                    {Array.isArray(formData.autoKeywords) && formData.autoKeywords.map((kw: string, i: number) => (
                                        <span key={`auto-${i}`} className="text-xs px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--foreground)] font-medium border border-[var(--border)]">
                                            {kw} <span className="text-[9px] text-[var(--muted-foreground)] ml-1">AI</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-card rounded-2xl p-6 md:p-8 border border-[var(--border)]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            Collections
                            <span className="bg-[var(--muted)] text-[var(--muted-foreground)] text-xs px-2 py-0.5 rounded-full font-medium">{entryCollections?.length || 0}</span>
                        </h3>

                        <div className="space-y-4 mb-6">
                            {Array.isArray(entryCollections) && entryCollections.length > 0 ? (
                                entryCollections.map((collection: any) => (
                                    <div key={collection.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                                        <div>
                                            <h4 className="font-medium text-sm">{collection.name}</h4>
                                            {collection.description && (
                                                <p className="text-xs text-[var(--muted-foreground)] mt-1">{collection.description}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFromCollection(collection.id)}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[var(--muted-foreground)] text-sm italic">
                                    Not in any collections yet.
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={selectedCollection}
                                onChange={(e) => setSelectedCollection(e.target.value)}
                                className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]"
                            >
                                <option value="">Select a collection...</option>
                                {Array.isArray(availableCollections) && availableCollections.map((collection: any) => (
                                    <option key={collection.id} value={collection.id}>
                                        {collection.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddToCollection}
                                disabled={!selectedCollection || isAddingToCollection}
                                className="bg-[var(--foreground)] text-[var(--background)] px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {isAddingToCollection ? 'Adding...' : 'Add to Collection'}
                            </button>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6 md:p-8 border border-[var(--border)]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            Notes
                            <span className="bg-[var(--muted)] text-[var(--muted-foreground)] text-xs px-2 py-0.5 rounded-full font-medium">{notesList.length}</span>
                        </h3>

                        <div className="space-y-4 mb-8">
                            {notesList.map((note: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.text}</p>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-3">
                                        {new Date(note.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            ))}
                            {notesList.length === 0 && (
                                <div className="text-center py-8 text-[var(--muted-foreground)] text-sm italic">
                                    No notes yet. Add your thoughts below.
                                </div>
                            )}
                        </div>

                        <div className="bg-[var(--background)] border border-[var(--border)] p-4 rounded-xl focus-within:ring-1 focus-within:ring-[var(--primary)] focus-within:border-[var(--primary)] transition-shadow">
                            <textarea
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                placeholder="Write a new note..."
                                rows={3}
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-sm resize-none"
                            />
                            <div className="flex justify-end mt-2 pt-2 border-t border-[var(--border)]">
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim() || isAddingNote}
                                    className="bg-[var(--foreground)] text-[var(--background)] px-4 py-1.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                                >
                                    {isAddingNote ? 'Adding...' : 'Add Note'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Share Entry</h2>
                            <button onClick={() => setShowShareModal(false)} className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)] truncate">
                            Sharing: <span className="font-medium text-[var(--foreground)]">{initialData.title}</span>
                        </p>

                        {connections.length === 0 ? (
                            <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                                You have no accepted connections yet. Connect with people first from the{' '}
                                <a href="/connections" className="text-[var(--primary)] hover:underline">Connections</a> page.
                            </p>
                        ) : (
                            <form onSubmit={handleShare} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Share with</label>
                                    <select
                                        value={shareReceiverId}
                                        onChange={e => setShareReceiverId(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    >
                                        <option value="">Select a connection…</option>
                                        {connections.map((c: any) => (
                                            <option key={c.id} value={c.otherUser.id}>
                                                {c.otherUser.name || c.otherUser.username}
                                                {c.otherUser.username ? ` (@${c.otherUser.username})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">
                                        Message <span className="font-normal text-[var(--muted-foreground)]">(optional)</span>
                                    </label>
                                    <textarea
                                        value={shareMessage}
                                        onChange={e => setShareMessage(e.target.value)}
                                        maxLength={280}
                                        rows={3}
                                        placeholder="Add a note for the recipient…"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                    <p className="text-xs text-[var(--muted-foreground)] text-right">{shareMessage.length}/280</p>
                                </div>
                                {shareResult && (
                                    <div className={`p-3 rounded-lg text-sm ${shareResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                        {shareResult.text}
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end pt-2">
                                    <button type="button" onClick={() => setShowShareModal(false)} className="px-4 py-2 rounded-md text-sm border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                                        Close
                                    </button>
                                    <button type="submit" disabled={!shareReceiverId || isSharing} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity">
                                        {isSharing ? 'Sharing…' : 'Share'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
