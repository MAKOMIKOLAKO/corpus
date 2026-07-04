'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Trash2, Eye, Loader2 } from 'lucide-react';
import EntryCard from '@/components/EntryCard';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { FlatEntry } from '@/types/entry';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import BibliographyGenerateDialog from '@/components/BibliographyGenerateDialog';

interface CollectionEntry extends FlatEntry {
    addedAt: string;
}

interface CollectionMember {
    id: string;
    userId: string;
    role: 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN';
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    invitedAt: string;
    acceptedAt: string | null;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface Collection {
    id: string;
    name: string;
    description?: string | null;
    isPublic?: boolean;
    publicSlug?: string | null;
    publicViewCount?: number;
    publicDescription?: string | null;
    userId?: string | null;
    metadata?: any;
    activeAlertCount?: number;
    entries?: CollectionEntry[];
    members?: CollectionMember[];
    _count: {
        entries: number;
        members?: number;
    };
}

export default function CollectionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [collection, setCollection] = useState<Collection | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [removing, setRemoving] = useState<string | null>(null);
    const [deletingCollection, setDeletingCollection] = useState(false);
    const [showBibliographyDialog, setShowBibliographyDialog] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Use scroll position restoration for collection pages
    if (params?.id) {
        useScrollPosition(`collection-${params.id}`);
    }

    useEffect(() => {
        if (params?.id) {
            fetchCollection();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params?.id]);

    const fetchCollection = async () => {
        try {
            const response = await fetch(`/api/collections/${params?.id}`);
            if (response.ok) {
                const data = await response.json();
                setCollection(data);
            } else {
                console.error('Collection not found');
                router.push('/collections');
            }
        } catch (error) {
            console.error('Error fetching collection:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveEntry = async (entryId: string) => {
        if (!entryId || !confirm('Remove this entry from the collection?')) return;

        setRemoving(entryId);
        try {
            const response = await fetch(`/api/collections/${params?.id}/entries/${entryId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Update local state to maintain scroll position
                setCollection(prev => prev ? {
                    ...prev,
                    entries: prev.entries?.filter(item => item.id !== entryId) || [],
                    _count: {
                        entries: prev._count.entries - 1
                    }
                } : null);
            } else {
                const error = await response.json();
                alert(`Failed to remove entry: ${error.error}`);
            }
        } catch (error) {
            console.error('Error removing entry:', error);
            alert('Failed to remove entry');
        } finally {
            setRemoving(null);
        }
    };

    const handleDeleteCollection = async () => {
        if (!collection) return;

        if (!confirm(`Are you sure you want to delete "${collection.name}"? This action cannot be undone.`)) {
            return;
        }

        setDeletingCollection(true);
        try {
            const response = await fetch(`/api/collections/${params?.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                router.push('/collections');
            } else {
                const data = await response.json();
                alert(data?.error || 'Failed to delete collection');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            alert('Failed to delete collection');
        } finally {
            setDeletingCollection(false);
        }
    };

    const isOwner = collection?.userId === session?.user?.id;

    const filteredEntries = collection?.entries?.filter(item =>
        item &&
        (item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.authors.some(author => author.toLowerCase().includes(search.toLowerCase())))
    ) || [];
    const bibliographyEntryIds = filteredEntries.slice(0, 200).map((entry) => entry.id);

    const openCollectionBibliography = () => {
        if (filteredEntries.length < 2) {
            toast.error('Select or filter to at least 2 entries to generate a bibliography');
            return;
        }
        if (filteredEntries.length > 200) {
            toast.info('Using the first 200 filtered entries for bibliography generation');
        }
        setShowBibliographyDialog(true);
    };

    if (loading) {
        return <div className="text-center py-12">Loading collection...</div>;
    }

    if (!collection) {
        return <div className="text-center py-12">Collection not found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <Link href="/collections">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Collections
                    </Button>
                </Link>
            </div>

            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-medium tracking-tight">{collection.name}</h2>
                        {collection.description && (
                            <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                            {collection._count.entries} {collection._count.entries === 1 ? 'entry' : 'entries'}
                            {collection.isPublic && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {collection.publicViewCount || 0} views
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openCollectionBibliography}
                            title={filteredEntries.length < 2 ? 'Need at least 2 entries' : undefined}
                        >
                            Bibliography
                        </Button>
                        {isOwner && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeleteCollection}
                                disabled={deletingCollection}
                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            >
                                {deletingCollection ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {showUpgradeModal && (
                <UpgradePrompt reason="bibliography_pro_only" onClose={() => setShowUpgradeModal(false)} />
            )}

            <BibliographyGenerateDialog
                isOpen={showBibliographyDialog}
                onClose={() => setShowBibliographyDialog(false)}
                userEntryIds={bibliographyEntryIds}
                defaultTitle={collection.name}
                onProRequired={() => setShowUpgradeModal(true)}
            />

            <div className="flex items-center gap-2 border-b border-border pb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search entries..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm"
                    />
                </div>
            </div>

            {filteredEntries.length === 0 ? (
                <div className="text-center py-24 rounded-lg bg-[var(--background)]">
                    <p className="text-[var(--muted-foreground)]">
                        {search ? 'No entries found matching your search.' : 'No entries in this collection yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredEntries.map(item => (
                        <div key={item?.id} className="relative group">
                            <EntryCard entry={item} scrollPositionKey={`collection-${params?.id}`} />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveEntry(item?.id)}
                                    disabled={removing === item?.id}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
