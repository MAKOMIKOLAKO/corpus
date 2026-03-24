'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import EntryCard from '@/components/EntryCard';
import { useApiKey } from '@/hooks/useApiKey';
import { useScrollPosition } from '@/hooks/useScrollPosition';

interface Collection {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    entries: Array<{
        id: string;
        addedAt: string;
        entry: {
            id: string;
            createdAt: string;
            title: string;
            authors: string[];
            year: number | null;
            contentType: string;
            readingStatus: 'UNREAD' | 'READING' | 'READ';
            autoKeywords: string[];
            topics: string[];
            collections?: Array<{
                id: string;
                collection: {
                    id: string;
                    name: string;
                };
            }>;
        };
    }>;
    _count: {
        entries: number;
    };
}

export default function CollectionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const apiKey = useApiKey();
    const [collection, setCollection] = useState<Collection | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [removing, setRemoving] = useState<string | null>(null);

    // Use scroll position restoration for collection pages
    useScrollPosition(`collection-${params.id}`);

    useEffect(() => {
        if (params.id) {
            fetchCollection();
        }
    }, [params.id]);

    const fetchCollection = async () => {
        try {
            const response = await fetch(`/api/collections/${params.id}`);
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
        if (!confirm('Remove this entry from the collection?')) return;

        setRemoving(entryId);
        try {
            const response = await fetch(`/api/collections/${params.id}/entries/${entryId}`, {
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (response.ok) {
                // Update local state to maintain scroll position
                setCollection(prev => prev ? {
                    ...prev,
                    entries: prev.entries.filter(item => item.entry.id !== entryId),
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

    const filteredEntries = collection?.entries.filter(item =>
        item.entry.title.toLowerCase().includes(search.toLowerCase()) ||
        item.entry.authors.some(author => author.toLowerCase().includes(search.toLowerCase())) ||
        item.entry.topics.some(topic => topic.toLowerCase().includes(search.toLowerCase())) ||
        item.entry.autoKeywords.some(keyword => keyword.toLowerCase().includes(search.toLowerCase()))
    ) || [];

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
                <h2 className="text-xl font-medium tracking-tight">{collection.name}</h2>
                {collection.description && (
                    <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                    {collection._count.entries} {collection._count.entries === 1 ? 'entry' : 'entries'}
                </p>
            </div>

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
                        <div key={item.id} className="relative group">
                            <EntryCard entry={item.entry} scrollPositionKey={`collection-${params.id}`} />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveEntry(item.entry.id)}
                                    disabled={removing === item.entry.id}
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
