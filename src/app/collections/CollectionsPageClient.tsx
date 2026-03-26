'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, FileText, Loader2, Users, Check, X, Globe, Eye, Building2 } from 'lucide-react';
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
    isLabCollection?: boolean;
    lab?: {
        id: string;
        name: string;
    } | null;
    _count: {
        entries: number;
        members?: number;
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
    const [invites, setInvites] = useState<CollectionInvite[]>([]);
    const [labs, setLabs] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollection, setNewCollection] = useState({ name: '', description: '', labId: '' });
    const [creating, setCreating] = useState(false);
    const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null);
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

    useEffect(() => {
        fetchCollections();
        fetchInvites();
        fetchLabs();
    }, []);

    const fetchLabs = async () => {
        try {
            const response = await fetch('/api/labs');
            if (response.ok) {
                const data = await response.json();
                setLabs(data);
            }
        } catch (error) {
            console.error('Failed to fetch labs:', error);
        }
    };

    const fetchCollections = async () => {
        try {
            const response = await fetch(`/api/collections?t=${Date.now()}`, { cache: 'no-store' as RequestCache });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Collections API error:', errorData.error || response.statusText);
                throw new Error(errorData.error || 'Failed to fetch collections');
            }
            const data = await response.json();
            setCollections(data);
        } catch (error) {
            console.error('Error fetching collections:', error);
            // Don't set collections to empty array, keep previous state if available
        } finally {
            setLoading(false);
        }
    };

    const fetchInvites = async () => {
        try {
            const response = await fetch(`/api/collections/invites?t=${Date.now()}`, { cache: 'no-store' as RequestCache });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Invites API error:', errorData.error || response.statusText);
                throw new Error(errorData.error || 'Failed to fetch invites');
            }
            const data = await response.json();
            setInvites(data);
        } catch (error) {
            console.error('Error fetching invites:', error);
            // Set empty array on error to prevent UI issues
            setInvites([]);
        }
    };

    const handleRespondToInvite = async (inviteId: string, status: 'ACCEPTED' | 'DECLINED') => {
        setRespondingToInvite(inviteId);
        try {
            const response = await fetch(`/api/collections/${invites.find(i => i.id === inviteId)?.collection.id}/members/${inviteId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (response.ok) {
                setInvites(invites.filter(i => i.id !== inviteId));
                if (status === 'ACCEPTED') {
                    fetchCollections();
                }
            } else {
                const error = await response.json();
                alert(`Failed to respond to invite: ${error.error}`);
            }
        } catch (error) {
            alert('Failed to respond to invite');
        } finally {
            setRespondingToInvite(null);
        }
    };

    const handleCreateCollection = async () => {
        setFormError(null);
        if (!isValid) {
            setTouched({ name: true, description: touched.description });
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
                    ...(newCollection.labId && { labId: newCollection.labId }),
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && data?.id) {
                // Reset and navigate to the newly created collection
                setNewCollection({ name: '', description: '', labId: '' });
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
            {!hasPaidFeature(session?.user || null, 'collections') && (
                <UpgradeBanner
                    message="Collections are a Pro feature. Upgrade to unlock unlimited collections and grouping."
                    ctaText="Upgrade to Pro"
                />
            )}

            {/* Pending Invites Section */}
            {invites.length > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-base">
                            You have {invites.length} pending collection {invites.length === 1 ? 'invite' : 'invites'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {invites.map((invite) => (
                                <div key={invite.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{invite.collection.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Invited by {invite.inviter.name || invite.inviter.email} as {invite.role.toLowerCase()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRespondToInvite(invite.id, 'ACCEPTED')}
                                            disabled={respondingToInvite === invite.id}
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRespondToInvite(invite.id, 'DECLINED')}
                                            disabled={respondingToInvite === invite.id}
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Decline
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">collections</h1>
                    <p className="text-sm text-muted-foreground">organize your entries into custom collections.</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    disabled={!hasPaidFeature(session?.user || null, 'collections')}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    new collection
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">loading collections...</div>
            ) : (
                <>
                    {/* My Collections - Owned and Member */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-medium text-foreground">My Collections</h2>
                        {myCollections.length === 0 ? (
                            <div className="text-center py-12 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                                <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                                <p className="text-[var(--muted-foreground)] mb-2">no collections yet.</p>
                                <p className="text-sm text-muted-foreground">create your first collection to start organizing your entries.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myCollections.map(collection => (
                                    <Link key={collection.id} href={`/collections/${collection.id}`}>
                                        <Card className="h-full hover:border-foreground/30 transition-colors cursor-pointer">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <CardTitle className="font-medium text-[15px] leading-snug group-hover:text-primary transition-colors flex-1">
                                                        {collection.name}
                                                    </CardTitle>
                                                    <div className="flex gap-1 flex-shrink-0">
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
                                                        {collection.isLabCollection && (
                                                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-700">
                                                                <Building2 className="w-3 h-3 mr-1" />
                                                                Lab
                                                            </Badge>
                                                        )}
                                                        {collection.isOwner && collection._count?.members && collection._count.members > 0 && (
                                                            <Badge variant="secondary" className="text-xs">Shared</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {collection.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                        {collection.description}
                                                    </p>
                                                )}
                                                {collection.lab && (
                                                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {collection.lab.name}
                                                    </p>
                                                )}
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {collection._count.entries} {collection._count.entries === 1 ? 'entry' : 'entries'}
                                                        </div>
                                                        {collection.isPublic && (
                                                            <div className="flex items-center gap-1">
                                                                <Eye className="w-3 h-3" />
                                                                {collection.publicViewCount || 0} views
                                                            </div>
                                                        )}
                                                        {collection._count?.members !== undefined && collection._count.members > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                                {collection._count.members + 1} {collection._count.members + 1 === 1 ? 'member' : 'members'}
                                                            </div>
                                                        )}
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
                    </div>

                    {/* Discovery Collections - Public Collections */}
                    {discoveryCollections.length > 0 && (
                        <div className="space-y-4 pt-8 border-t border-[var(--border)]">
                            <h2 className="text-lg font-medium text-foreground">Discover Public Collections</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {discoveryCollections.map(collection => (
                                    <Link key={collection.id} href={`/collections/${collection.id}`}>
                                        <Card className="h-full hover:border-foreground/30 transition-colors cursor-pointer opacity-90 hover:opacity-100">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <CardTitle className="font-medium text-[15px] leading-snug group-hover:text-primary transition-colors flex-1">
                                                        {collection.name}
                                                    </CardTitle>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-200 dark:border-green-700">
                                                            <Globe className="w-3 h-3 mr-1" />
                                                            Public
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {collection.publicDescription && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                        {collection.publicDescription}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    by @{collection.user?.username || 'anonymous'}
                                                </p>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {collection._count.entries} {collection._count.entries === 1 ? 'entry' : 'entries'}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Eye className="w-3 h-3" />
                                                            {collection.publicViewCount || 0} views
                                                        </div>
                                                        {collection._count?.members !== undefined && collection._count.members > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                                {collection._count.members + 1} {collection._count.members + 1 === 1 ? 'member' : 'members'}
                                                            </div>
                                                        )}
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
                        </div>
                    )}
                </>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="bg-white border rounded-lg shadow-2xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium mb-4">Create New Collection</h3>

                        {formError && (
                            <div className="mb-4 p-2 border border-red-300 text-red-700 rounded text-sm">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newCollection.name}
                                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                                    onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                                    className={`w-full px-3 py-2 border rounded-md bg-background ${(touched.name && (nameTooShort || nameTooLong)) ? 'border-red-500' : ''
                                        }`}
                                    placeholder="Enter collection name"
                                    aria-invalid={touched.name && (nameTooShort || nameTooLong)}
                                    aria-describedby="name-help"
                                    autoFocus
                                />
                                <div id="name-help" className="mt-1 flex items-center justify-between text-xs">
                                    <span className={`${touched.name && nameTooShort ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {touched.name && nameTooShort ? `Name must be at least ${NAME_MIN} characters` : 'A short, descriptive name'}
                                    </span>
                                    <span className={`${nameTooLong ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {newCollection.name.trim().length}/{NAME_MAX}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description (optional)</label>
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

                            {labs.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Lab (optional)</label>
                                    <select
                                        value={newCollection.labId}
                                        onChange={(e) => setNewCollection({ ...newCollection, labId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                    >
                                        <option value="">Personal collection</option>
                                        {labs.map((lab) => (
                                            <option key={lab.id} value={lab.id}>
                                                {lab.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Create this collection for a lab. All lab members will be able to contribute.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCollection} disabled={creating || !isValid}>
                                {creating ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </span>
                                ) : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
