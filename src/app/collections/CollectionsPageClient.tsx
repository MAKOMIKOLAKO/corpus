'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, FileText, Loader2, Users, Check, X, Globe, Eye, Trash2 } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import UpgradeBanner from '@/components/UpgradeBanner';
import { useSession } from 'next-auth/react';
import { hasPaidFeature } from '@/lib/plans';

interface CollectionInvite {
    id: string;
    role: 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN';
    invitedAt: string;
    collection: {
        id: string;
        name: string;
        description: string | null;
    };
    inviter: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface Collection {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    isOwner?: boolean;
    userRole?: 'OWNER' | 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN';
    members?: any[];
    isPublic?: boolean;
    publicViewCount?: number;
    publicDescription?: string | null;
    user?: {
        name?: string | null;
        username?: string | null;
    } | null;
    isDiscovery?: boolean;
    _count: {
        entries: number;
        members?: number;
    };
}

// Loading skeleton component
function CollectionsLoading() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader>
                        <div className="h-5 bg-[var(--muted)] rounded w-3/4"></div>
                        <div className="h-4 bg-[var(--muted)] rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-4 bg-[var(--muted)] rounded w-full mb-2"></div>
                        <div className="h-4 bg-[var(--muted)] rounded w-2/3"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function CollectionsPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [invites, setInvites] = useState<CollectionInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollection, setNewCollection] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null);
    const [deletingCollection, setDeletingCollection] = useState<string | null>(null);
    const apiKey = useApiKey();
    const { data: session } = useSession();
    const router = useRouter();

    const NAME_MAX = 80;
    const NAME_MIN = 3;
    const DESC_MAX = 280;
    const [formError, setFormError] = useState<string | null>(null);
    const [touched, setTouched] = useState<{ name: boolean; description: boolean }>({ name: false, description: false });
    const nameTooShort = newCollection.name.trim().length > 0 && newCollection.name.trim().length < NAME_MIN;
    const nameTooLong = newCollection.name.trim().length > NAME_MAX;
    const descTooLong = newCollection.description.trim().length > DESC_MAX;
    const isValid = newCollection.name.trim().length >= NAME_MIN && !nameTooLong && !descTooLong;

    const fetchInvites = useCallback(async () => {
        try {
            const response = await fetch('/api/collections/invites');
            if (response.ok) {
                const data = await response.json();
                setInvites(data);
            }
        } catch (error) {
            console.error('Failed to fetch invites:', error);
        }
    }, []);

    const fetchCollections = useCallback(async () => {
        try {
            const response = await fetch('/api/collections', {
                headers: { 'x-api-key': apiKey },
            });
            if (response.ok) {
                const data = await response.json();
                setCollections([...data.owned, ...data.member]);
            }
        } catch (error) {
            console.error('Failed to fetch collections:', error);
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    useEffect(() => {
        fetchCollections();
        fetchInvites();
    }, [fetchCollections, fetchInvites]);

    const handleCreateCollection = async () => {
        setFormError(null);
        setTouched({ name: true, description: true });

        if (!isValid) {
            return;
        }

        setCreating(true);
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    name: newCollection.name.trim().slice(0, NAME_MAX),
                    description: newCollection.description.trim().slice(0, DESC_MAX),
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && data?.id) {
                // Reset and navigate to the newly created collection
                setNewCollection({ name: '', description: '' });
                setShowCreateModal(false);
                // Optimistically update list
                fetchCollections();
                router.push(`/collections/${data.id}`);
            } else {
                const message = data?.error || 'Failed to create collection';
                setFormError(message);
            }
        } catch (error: any) {
            const message = error?.message || 'Failed to create collection';
            setFormError(message);
        } finally {
            setCreating(false);
        }
    };

    const handleRespondToInvite = async (inviteId: string, action: 'accept' | 'decline') => {
        setRespondingToInvite(inviteId);
        try {
            const response = await fetch(`/api/collections/invites/${inviteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            if (response.ok) {
                // Refresh both collections and invites
                await Promise.all([fetchCollections(), fetchInvites()]);
            } else {
                const data = await response.json();
                alert(data?.error || `Failed to ${action} invite`);
            }
        } catch (error) {
            console.error(`Failed to ${action} invite:`, error);
            alert(`Failed to ${action} invite`);
        } finally {
            setRespondingToInvite(null);
        }
    };

    const handleDeleteCollection = async (collectionId: string, collectionName: string) => {
        if (!confirm(`Are you sure you want to delete "${collectionName}"? This action cannot be undone.`)) {
            return;
        }

        setDeletingCollection(collectionId);
        try {
            const response = await fetch(`/api/collections/${collectionId}`, {
                method: 'DELETE',
                headers: { 'x-api-key': apiKey },
            });

            if (response.ok) {
                // Remove from local state
                setCollections(prev => prev.filter(c => c.id !== collectionId));
            } else {
                const data = await response.json();
                alert(data?.error || 'Failed to delete collection');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            alert('Failed to delete collection');
        } finally {
            setDeletingCollection(null);
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

    // Separate collections into my collections and discovery
    const myCollections = collections.filter(c => !c.isDiscovery);
    const discoveryCollections = collections.filter(c => c.isDiscovery);

    return (
        <div className="space-y-6">
            {/* Upgrade Banner for Collections Feature */}
            {session?.user && !hasPaidFeature(session.user, 'collections') && (
                <UpgradeBanner
                    message="Create and share collections of entries with other users. Upgrade to Pro to unlock collections."
                    ctaText="Upgrade to Pro for Collections"
                />
            )}

            {/* Create Collection Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">Collections</h1>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    disabled={!session?.user || !hasPaidFeature(session.user, 'collections')}
                    className="w-full sm:w-auto touch-manipulation h-11 sm:h-9"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Collection
                </Button>
            </div>

            {/* Pending Collection Invites */}
            {invites.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Pending Invites</h2>
                    <div className="space-y-3">
                        {invites.map((invite) => (
                            <Card key={invite.id} className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-lg">{invite.collection.name}</h3>
                                        {invite.collection.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {invite.collection.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Invited by {invite.inviter.name || invite.inviter.email}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRespondToInvite(invite.id, 'accept')}
                                            disabled={respondingToInvite === invite.id}
                                        >
                                            {respondingToInvite === invite.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Accept'
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRespondToInvite(invite.id, 'decline')}
                                            disabled={respondingToInvite === invite.id}
                                        >
                                            {respondingToInvite === invite.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Decline'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* My Collections */}
            {myCollections.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">My Collections</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {myCollections.map((collection) => (
                            <div key={collection.id} className="relative">
                                <Link href={`/collections/${collection.id}`}>
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-xl truncate">{collection.name}</CardTitle>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        {collection.isOwner && (
                                                            <Badge variant="default" className="text-xs">Owner</Badge>
                                                        )}
                                                        {!collection.isOwner && collection.userRole === 'ADMIN' && (
                                                            <Badge variant="default" className="text-xs">Admin</Badge>
                                                        )}
                                                        {!collection.isOwner && collection.userRole === 'CONTRIBUTOR' && (
                                                            <Badge variant="outline" className="text-xs">Contributor</Badge>
                                                        )}
                                                        {!collection.isOwner && collection.userRole === 'VIEWER' && (
                                                            <Badge variant="outline" className="text-xs">Member</Badge>
                                                        )}
                                                        {collection.isOwner && collection._count?.members && collection._count.members > 0 && (
                                                            <Badge variant="secondary" className="text-xs">Shared</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {collection.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-3 mt-3 leading-relaxed">
                                                    {collection.description}
                                                </p>
                                            )}
                                        </CardHeader>
                                        <CardContent className="pt-3">
                                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        <span className="font-medium">{collection._count.entries}</span>
                                                        <span>{collection._count.entries === 1 ? 'entry' : 'entries'}</span>
                                                    </div>
                                                    {collection.isPublic && (
                                                        <div className="flex items-center gap-1">
                                                            <Eye className="w-4 h-4" />
                                                            <span className="font-medium">{collection.publicViewCount || 0}</span>
                                                            <span>views</span>
                                                        </div>
                                                    )}
                                                    {collection._count?.members !== undefined && collection._count.members > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Users className="w-4 h-4" />
                                                            <span className="font-medium">{collection._count.members + 1}</span>
                                                            <span>{collection._count.members + 1 === 1 ? 'member' : 'members'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(collection.createdAt)}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                                {collection.isOwner && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteCollection(collection.id, collection.name);
                                        }}
                                        disabled={deletingCollection === collection.id}
                                        className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
                                    >
                                        {deletingCollection === collection.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Collection Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl p-6 max-w-[480px] w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Create New Collection</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 uppercase tracking-tight text-[var(--muted-foreground)]">Name *</label>
                                <input
                                    type="text"
                                    value={newCollection.name}
                                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                                    onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                                    className={`w-full px-3 py-3 sm:py-2 border rounded-md bg-[var(--background)] touch-manipulation ${(touched.name && (nameTooShort || nameTooLong)) ? 'border-red-500' : 'border-[var(--border)]'
                                        }`}
                                    placeholder="Enter collection name"
                                    aria-invalid={touched.name && (nameTooShort || nameTooLong)}
                                />
                                {touched.name && nameTooShort && (
                                    <p className="mt-1 text-xs text-red-600">
                                        Name must be at least {NAME_MIN} characters
                                    </p>
                                )}
                                {touched.name && nameTooLong && (
                                    <p className="mt-1 text-xs text-red-600">
                                        Name must be {NAME_MAX} characters or less
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={newCollection.description}
                                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                                    onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                                    className={`w-full px-3 py-2 border rounded-md bg-background resize-none ${(touched.description && descTooLong) ? 'border-red-500' : ''
                                        }`}
                                    rows={3}
                                    placeholder="Enter collection description"
                                    aria-invalid={touched.description && descTooLong}
                                    aria-describedby="desc-help"
                                />
                                <div id="desc-help" className="mt-1 flex items-center justify-end text-xs">
                                    <span className={`${descTooLong ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {newCollection.description.trim().length}/{DESC_MAX}
                                    </span>
                                </div>
                            </div>

                            {formError && (
                                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    onClick={handleCreateCollection}
                                    disabled={creating || !isValid}
                                    className="flex-1 h-11 sm:h-9 touch-manipulation"
                                >
                                    {creating ? (
                                        <span className="flex items-center">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Creating...
                                        </span>
                                    ) : 'Create'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creating}
                                    className="flex-1 h-11 sm:h-9 touch-manipulation"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {myCollections.length === 0 && (
                <div className="text-center py-12">
                    <div className="max-w-md mx-auto">
                        <h3 className="text-lg font-medium mb-2">No collections yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Create your first collection to start organizing your entries.
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Collection
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
