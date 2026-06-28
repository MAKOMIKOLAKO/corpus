'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, FileText, Loader2, Trash2, Search, Brain, Play, Pause, Sparkles, Check, XCircle, Inbox, ListChecks } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import { useSession } from 'next-auth/react';
import { hasPaidFeature } from '@/lib/plans';
import { toast } from 'sonner';
import { useTimezone } from '@/hooks/useTimezone';

interface Collection {
  id: string;
  name: string;
  description: string | null;
}

interface WatchQuery {
  id: string;
  query: string;
  maxPapers?: number;
  isActive: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  collection: Collection;
  _count?: {
    entries: number;
  };
}

interface AlertContainerSummary {
  id: string;
  query: string;
  collectionId: string | null;
  watchQueryId: string;
  createdAt: string;
  updatedAt: string;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface AlertContainerEntry {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  url: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface AlertContainerDetail extends AlertContainerSummary {
  entries: AlertContainerEntry[];
}

const MAX_QUERIES_PER_USER = 5;

interface AlertsManagementPanelProps {
  userId: string;
  onClose: () => void;
}

export function AlertsManagementPanel({ userId, onClose }: AlertsManagementPanelProps) {
  const { data: session, status } = useSession();
  const apikey = useApiKey();
  const timezone = useTimezone();

  const [watchQueries, setWatchQueries] = useState<WatchQuery[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingQuery, setTogglingQuery] = useState<string | null>(null);
  const [containers, setContainers] = useState<AlertContainerSummary[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<AlertContainerDetail | null>(null);
  const [loadingContainerDetail, setLoadingContainerDetail] = useState(false);
  const [containerLifecycleMessage, setContainerLifecycleMessage] = useState<string | null>(null);
  const [actingOnEntryId, setActingOnEntryId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState<'approve_all' | 'reject_all' | null>(null);
  const [activeView, setActiveView] = useState<'alerts' | 'containers'>('alerts');

  // Form state
  const [newQuery, setNewQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [newQueryMaxPapers, setNewQueryMaxPapers] = useState<string>('5');

  const isPro = hasPaidFeature(session?.user?.plan || 'FREE', 'smart_alerts');

  const fetchWatchQueries = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/watch-queries', {
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Pro plan required');
        }
        throw new Error('Failed to fetch watch queries');
      }

      const data = await response.json();
      setWatchQueries(data);
    } catch (error) {
      console.error('Error fetching watch queries:', error);
      if (error instanceof Error && error.message.includes('Pro plan')) {
        // Don't show toast for pro plan error
      } else {
        toast.error('Failed to load alerts');
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, apikey]);

  const fetchContainers = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoadingContainers(true);
    try {
      const response = await fetch('/api/alert-containers', {
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alert containers');
      }

      const data = await response.json();
      const list = Array.isArray(data) ? (data as AlertContainerSummary[]) : [];
      setContainers(list);

      if (selectedContainerId) {
        const exists = list.some((container) => container.id === selectedContainerId);
        if (!exists) {
          setSelectedContainerId(null);
          setSelectedContainer(null);
        }
      }
    } catch (error) {
      console.error('Error fetching alert containers:', error);
      toast.error('Failed to load alert containers');
    } finally {
      setLoadingContainers(false);
    }
  }, [session?.user?.id, apikey, selectedContainerId]);

  const fetchContainerDetail = useCallback(async (containerId: string) => {
    setLoadingContainerDetail(true);
    try {
      const response = await fetch(`/api/alert-containers/${containerId}`, {
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch container details');
      }

      const data = await response.json();
      setSelectedContainer(data as AlertContainerDetail);
      setSelectedContainerId(containerId);
      setContainerLifecycleMessage(null);
    } catch (error) {
      console.error('Error fetching container details:', error);
      toast.error('Failed to load container details');
    } finally {
      setLoadingContainerDetail(false);
    }
  }, [apikey]);

  const fetchCollections = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/collections', {
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch collections');

      const data = await response.json();
      const ownedCollections = Array.isArray(data)
        ? data.filter((col: any) => col?.isOwner)
        : Array.isArray(data?.owned)
          ? data.owned
          : [];

      setCollections(
        ownedCollections.map((col: any) => ({
          id: col.id,
          name: col.name,
          description: col.description ?? null,
        }))
      );
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, [session?.user?.id, apikey]);

  const fetchAll = useCallback(() => {
    fetchWatchQueries();
    fetchCollections();
    fetchContainers();
  }, [fetchWatchQueries, fetchCollections, fetchContainers]);

  useState(() => {
    if (status === 'authenticated' && apikey) {
      fetchAll();
    }
  });

  const handleCreateQuery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    if (!selectedCollectionId && !newQuery.trim()) {
      toast.error('Please select a collection or enter a query for auto-creation');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/watch-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apikey || '',
        },
        body: JSON.stringify({
          query: newQuery.trim(),
          collectionId: selectedCollectionId || undefined,
          maxPapers: Number(newQueryMaxPapers),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          throw new Error('Pro plan required');
        }
        if (response.status === 400 && error.error?.includes('Maximum')) {
          throw new Error(error.error);
        }
        throw new Error('Failed to create alert');
      }

      const newWatchQuery = await response.json();
      setWatchQueries(prev => [newWatchQuery, ...prev]);
      setNewQuery('');
      setSelectedCollectionId('');
      setNewQueryMaxPapers('5');
      setShowCreateForm(false);
      toast.success('Alert created successfully');

      if (!selectedCollectionId) {
        fetchCollections();
      }
    } catch (error) {
      console.error('Error creating watch query:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create alert');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMaxPapers = async (queryId: string, value: string) => {
    const nextValue = Number(value);
    try {
      const response = await fetch(`/api/watch-queries/${queryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apikey || '',
        },
        body: JSON.stringify({ maxPapers: nextValue }),
      });

      if (!response.ok) throw new Error('Failed to update max papers');

      setWatchQueries((prev) => prev.map((q) => (q.id === queryId ? { ...q, maxPapers: nextValue } : q)));
      toast.success('Max papers updated');
    } catch (error) {
      console.error('Error updating max papers:', error);
      toast.error('Failed to update max papers');
    }
  };

  const handleContainerEntryAction = async (entryId: string, action: 'approve' | 'reject') => {
    if (!selectedContainerId || !selectedContainer) return;

    setActingOnEntryId(entryId);
    try {
      const response = await fetch(`/api/alert-containers/${selectedContainerId}/entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apikey || '',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update alert entry');
      }

      const data = await response.json();

      if (data?.containerDeleted) {
        setContainers((prev) => prev.filter((container) => container.id !== selectedContainerId));
        setSelectedContainerId(null);
        setSelectedContainer(null);
        setContainerLifecycleMessage('All papers in this container were processed, so it was automatically deleted.');
        toast.success(action === 'approve' ? 'Paper approved. Container completed and deleted.' : 'Paper rejected. Container completed and deleted.');
        return;
      }

      setSelectedContainer((prev) => {
        if (!prev) return prev;
        const nextEntries = prev.entries.filter((entry) => entry.id !== entryId);
        const counts = nextEntries.reduce(
          (acc, entry) => {
            if (entry.status === 'PENDING') acc.pending += 1;
            if (entry.status === 'APPROVED') acc.approved += 1;
            if (entry.status === 'REJECTED') acc.rejected += 1;
            return acc;
          },
          { pending: 0, approved: 0, rejected: 0 }
        );
        return { ...prev, entries: nextEntries, counts };
      });

      setContainers((prev) =>
        prev.map((container) => {
          if (container.id !== selectedContainerId) return container;
          const nextPending = Math.max(0, container.counts.pending - 1);
          return {
            ...container,
            counts: {
              pending: nextPending,
              approved: container.counts.approved + (action === 'approve' ? 1 : 0),
              rejected: container.counts.rejected + (action === 'reject' ? 1 : 0),
            },
          };
        })
      );

      toast.success(action === 'approve' ? 'Paper approved' : 'Paper rejected');
    } catch (error) {
      console.error('Error updating alert entry:', error);
      toast.error('Failed to update alert entry');
    } finally {
      setActingOnEntryId(null);
    }
  };

  const handleBulkAction = async (action: 'approve_all' | 'reject_all') => {
    if (!selectedContainerId) return;

    setBulkActionLoading(action);
    try {
      const response = await fetch(`/api/alert-containers/${selectedContainerId}/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apikey || '',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed bulk action');
      }

      if (data?.containerDeleted) {
        setContainers((prev) => prev.filter((container) => container.id !== selectedContainerId));
        setSelectedContainerId(null);
        setSelectedContainer(null);
        setContainerLifecycleMessage('All papers in this container were processed, so it was automatically deleted.');
        toast.success(action === 'approve_all' ? 'Approved all pending papers. Container deleted.' : 'Rejected all pending papers. Container deleted.');
        return;
      }

      await fetchContainerDetail(selectedContainerId);
      await fetchContainers();
      toast.success(action === 'approve_all' ? 'Approved all pending papers' : 'Rejected all pending papers');
    } catch (error) {
      console.error('Error running bulk action:', error);
      toast.error('Bulk action failed');
    } finally {
      setBulkActionLoading(null);
    }
  };

  const handleDeleteContainer = async (containerId: string) => {
    if (!confirm('Delete this alert container and all staged papers?')) return;

    try {
      const response = await fetch(`/api/alert-containers/${containerId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete container');
      }

      setContainers((prev) => prev.filter((container) => container.id !== containerId));
      if (selectedContainerId === containerId) {
        setSelectedContainerId(null);
        setSelectedContainer(null);
      }
      toast.success('Container deleted');
    } catch (error) {
      console.error('Error deleting container:', error);
      toast.error('Failed to delete container');
    }
  };

  const handleToggleQuery = async (queryId: string, isActive: boolean) => {
    setTogglingQuery(queryId);
    try {
      const response = await fetch(`/api/watch-queries/${queryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apikey || '',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) throw new Error('Failed to toggle alert');

      setWatchQueries(prev => prev.map(q =>
        q.id === queryId ? { ...q, isActive: !isActive } : q
      ));
      toast.success(`Alert ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling watch query:', error);
      toast.error('Failed to toggle alert');
    } finally {
      setTogglingQuery(null);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this alert? This will permanently remove it and all its associated data.')) return;

    try {
      const response = await fetch(`/api/watch-queries/${queryId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      setWatchQueries(prev => prev.filter(q => q.id !== queryId));
      toast.success('Alert deleted successfully');
    } catch (error) {
      console.error('Error deleting watch query:', error);
      toast.error('Failed to delete alert');
    }
  };

  const formatDate = (dateString: string | null, timezone: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString(undefined, { timeZone: timezone });
  };

  const activeQueryCount = watchQueries.filter(q => q.isActive).length;
  const pendingEntries = selectedContainer?.entries.filter((entry) => entry.status === 'PENDING') ?? [];

  if (status === 'loading' || loading) {
    return (
      <div className="p-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Smart Alerts</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Automatically discover relevant papers for your research interests and route them into the right collection.
        </p>
        <Button onClick={onClose} className="w-full">
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Smart Alerts</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          ×
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveView('alerts')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeView === 'alerts'
            ? 'text-foreground border-b-2 border-accent'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Alerts
        </button>
        <button
          onClick={() => setActiveView('containers')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeView === 'containers'
            ? 'text-foreground border-b-2 border-accent'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Containers
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'alerts' ? (
          <div className="p-4 space-y-4">
            {/* Active count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {activeQueryCount} of {MAX_QUERIES_PER_USER} active
              </span>
              <Button
                size="sm"
                onClick={() => setShowCreateForm(true)}
                disabled={activeQueryCount >= MAX_QUERIES_PER_USER}
                className="h-8 gap-1"
              >
                <Plus className="h-3 w-3" />
                New
              </Button>
            </div>

            {activeQueryCount >= MAX_QUERIES_PER_USER && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-900">
                  Maximum active alerts reached
                </p>
              </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
              <Card className="border-border">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="query">Research interest</Label>
                    <Textarea
                      id="query"
                      value={newQuery}
                      onChange={(e) => setNewQuery(e.target.value)}
                      placeholder="e.g., spatial transcriptomics breast cancer"
                      rows={3}
                      maxLength={500}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="collection">Target collection</Label>
                    <Select value={selectedCollectionId} onValueChange={(value) => setSelectedCollectionId(value || '')}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Auto-create collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Auto-create collection</SelectItem>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-papers">Max papers/run</Label>
                    <Select value={newQueryMaxPapers} onValueChange={(value) => setNewQueryMaxPapers(value ?? '5')}>
                      <SelectTrigger id="max-papers" className="h-9 w-24 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {count}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateQuery}
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Watch Queries List */}
            {watchQueries.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No alerts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {watchQueries.map((watchQuery) => (
                  <Card key={watchQuery.id} className={`${!watchQuery.isActive ? 'opacity-60' : ''}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm font-medium truncate">{watchQuery.query}</p>
                        </div>
                        <Badge variant={watchQuery.isActive ? 'default' : 'secondary'} className="text-xs">
                          {watchQuery.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {watchQuery.collection?.name || 'No collection'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(watchQuery.lastCheckedAt, timezone)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {watchQuery._count?.entries ?? 0} papers added
                        </span>
                        <div className="flex items-center gap-1">
                          <Select
                            value={String(watchQuery.maxPapers ?? 5)}
                            onValueChange={(value) => handleUpdateMaxPapers(watchQuery.id, value ?? '5')}
                          >
                            <SelectTrigger className="h-7 w-16 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((count) => (
                                <SelectItem key={count} value={String(count)}>
                                  {count}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleQuery(watchQuery.id, watchQuery.isActive)}
                            disabled={togglingQuery === watchQuery.id}
                            className="h-7 w-7 p-0"
                          >
                            {togglingQuery === watchQuery.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : watchQuery.isActive ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuery(watchQuery.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {loadingContainers ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading containers...</p>
            ) : containers.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No containers yet</p>
              </div>
            ) : selectedContainer ? (
              <div className="space-y-4">
                {/* Container Detail */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{selectedContainer.query}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedContainer(null)}
                        className="h-7 w-7 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ListChecks className="h-3 w-3" />
                        {selectedContainer.counts.pending} pending
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedContainer.counts.pending === 0 || bulkActionLoading !== null}
                          onClick={() => handleBulkAction('approve_all')}
                          className="h-7 px-2 text-xs"
                        >
                          {bulkActionLoading === 'approve_all' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Approve All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedContainer.counts.pending === 0 || bulkActionLoading !== null}
                          onClick={() => handleBulkAction('reject_all')}
                          className="h-7 px-2 text-xs"
                        >
                          {bulkActionLoading === 'reject_all' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                          Reject All
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {pendingEntries.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">All papers processed</p>
                      ) : (
                        pendingEntries.map((entry) => (
                          <div key={entry.id} className="p-3 rounded-lg border border-border space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{entry.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.authors?.slice(0, 3).join(', ')}{entry.authors?.length > 3 ? '…' : ''}
                                  {entry.year ? ` • ${entry.year}` : ''}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">PENDING</Badge>
                            </div>

                            {entry.abstract && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{entry.abstract}</p>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              {entry.url ? (
                                <a href={entry.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                                  Open source
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">No URL</span>
                              )}

                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actingOnEntryId === entry.id}
                                  onClick={() => handleContainerEntryAction(entry.id, 'approve')}
                                  className="h-7 px-2 text-xs"
                                >
                                  {actingOnEntryId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actingOnEntryId === entry.id}
                                  onClick={() => handleContainerEntryAction(entry.id, 'reject')}
                                  className="h-7 px-2 text-xs"
                                >
                                  {actingOnEntryId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-2">
                {containers.map((container) => (
                  <Card
                    key={container.id}
                    className="cursor-pointer hover:border-accent/50 transition-colors"
                    onClick={() => fetchContainerDetail(container.id)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">{container.query}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContainer(container.id);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">Pending {container.counts.pending}</Badge>
                        <Badge variant="outline">Approved {container.counts.approved}</Badge>
                        <Badge variant="outline">Rejected {container.counts.rejected}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
