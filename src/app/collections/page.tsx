'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, FileText, Loader2 } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';

interface Collection {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    _count: {
        entries: number;
    };
}

// Loading skeleton component
function CollectionsLoading() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader>
                        <div className="h-5 bg-[var(--muted)] rounded w-3/4"></div>
                        <div className="h-4 bg-[var(--muted)] rounded w-full mt-2"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="h-6 bg-[var(--muted)] rounded-full w-16"></div>
                            <div className="h-4 bg-[var(--muted)] rounded w-20"></div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function CollectionsPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollection, setNewCollection] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const apiKey = useApiKey();

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        try {
            const response = await fetch('/api/collections');
            if (response.ok) {
                const data = await response.json();
                setCollections(data);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollection.name.trim()) return;

        setCreating(true);
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify(newCollection),
            });

            if (response.ok) {
                setNewCollection({ name: '', description: '' });
                setShowCreateModal(false);
                fetchCollections();
            } else {
                const error = await response.json();
                alert(`Failed to create collection: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            alert('Failed to create collection');
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return <div className="text-center py-12">Loading collections...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-medium tracking-tight">collections</h2>
                    <p className="text-sm text-muted-foreground">organize your entries into custom collections.</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    new collection
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">loading collections...</div>
            ) : collections.length === 0 ? (
                <div className="text-center py-24 rounded-lg bg-[var(--background)]">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-[var(--muted-foreground)] mb-4">no collections yet.</p>
                    <p className="text-sm text-muted-foreground">create your first collection to start organizing your entries.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {collections.map(collection => (
                        <Link key={collection.id} href={`/collections/${collection.id}`}>
                            <Card className="h-full hover:border-foreground/30 transition-colors cursor-pointer">
                                <CardHeader className="pb-3">
                                    <CardTitle className="font-medium text-[15px] leading-snug group-hover:text-primary transition-colors">
                                        {collection.name}
                                    </CardTitle>
                                    {collection.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {collection.description}
                                        </p>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            {collection._count.entries} {collection._count.entries === 1 ? 'entry' : 'entries'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(collection.createdAt)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-background border rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium mb-4">Create New Collection</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newCollection.name}
                                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md bg-background"
                                    placeholder="Enter collection name"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                                <textarea
                                    value={newCollection.description}
                                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                                    rows={3}
                                    placeholder="Enter collection description"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCollection} disabled={creating || !newCollection.name.trim()}>
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
