'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, FileText, Loader2, Trash2, Search, Brain, Bell, CheckCircle, XCircle, Play, Pause } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import UpgradeBanner from '@/components/UpgradeBanner';
import { useSession } from 'next-auth/react';
import { hasPaidFeature } from '@/lib/plans';
import { toast } from 'sonner';

interface Collection {
  id: string;
  name: string;
  description: string | null;
}

interface WatchQuery {
  id: string;
  query: string;
  isActive: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  collection: Collection;
  _count: {
    entries: number;
  };
}

const MAX_QUERIES_PER_USER = 5;

// Loading skeleton component
function AlertsLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-5 bg-[var(--muted)] rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-[var(--muted)] rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-[var(--muted)] rounded w-2/3"></div>
              </div>
              <div className="h-8 w-20 bg-[var(--muted)] rounded"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AlertsPageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const apikey = useApiKey();

  const [watchQueries, setWatchQueries] = useState<WatchQuery[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingQuery, setTogglingQuery] = useState<string | null>(null);

  // Form state
  const [newQuery, setNewQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

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
        // Don't show toast for pro plan error, just show upgrade banner
      } else {
        toast.error('Failed to load alerts');
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, apikey]);

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
      setCollections(data.filter((col: any) => col.isOwner));
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, [session?.user?.id, apikey]);

  useEffect(() => {
    if (status === 'authenticated' && apikey) {
      fetchWatchQueries();
      fetchCollections();
    }
  }, [status, apikey, fetchWatchQueries, fetchCollections]);

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
      setShowCreateForm(false);
      toast.success('Alert created successfully');

      // Refresh collections in case a new one was created
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
    if (!confirm('Are you sure you want to delete this alert? This will deactivate it.')) return;

    try {
      const response = await fetch(`/api/watch-queries/${queryId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      setWatchQueries(prev => prev.map(q =>
        q.id === queryId ? { ...q, isActive: false } : q
      ));
      toast.success('Alert deactivated');
    } catch (error) {
      console.error('Error deactivating watch query:', error);
      toast.error('Failed to deactivate alert');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Smart Alerts</h1>
              <p className="text-sm text-[var(--muted-foreground)]">Automatically discover relevant papers for your research interests</p>
            </div>
          </div>
          <AlertsLoading />
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Smart Alerts</h1>
              <p className="text-sm text-[var(--muted-foreground)]">Automatically discover relevant papers for your research interests</p>
            </div>
          </div>
          <UpgradeBanner
            message="Smart Alerts require a Pro plan. Get automatic paper discovery and intelligent filtering with Smart Alerts."
            ctaText="Upgrade to Pro"
          />
        </div>
      </div>
    );
  }

  const activeQueryCount = watchQueries.filter(q => q.isActive).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Smart Alerts</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Automatically discover relevant papers for your research interests</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={activeQueryCount >= MAX_QUERIES_PER_USER}
            className="gap-2 touch-manipulation h-11 sm:h-9"
          >
            <Plus className="w-4 h-4" />
            Create Alert
          </Button>
        </div>

        {/* Query Limit Indicator */}
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Your Alerts</h2>
          <Badge variant="secondary" className="text-xs">
            {activeQueryCount} / {MAX_QUERIES_PER_USER}
          </Badge>
        </div>
        {activeQueryCount >= MAX_QUERIES_PER_USER && (
          <p className="text-sm text-[var(--muted-foreground)]">
            You've reached the maximum number of active alerts. Deactivate an alert to create a new one.
          </p>
        )}

        {/* Create New Alert Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateQuery} className="space-y-4">
                <div>
                  <Label htmlFor="query">Research Interest</Label>
                  <Input
                    id="query"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    placeholder="e.g., machine learning healthcare, quantum computing, climate change"
                    className="mt-1"
                    maxLength={500}
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Enter keywords or phrases describing your research interests
                  </p>
                </div>

                <div>
                  <Label htmlFor="collection">Target Collection</Label>
                  <Select value={selectedCollectionId} onValueChange={(value) => setSelectedCollectionId(value || '')}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a collection or create new" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Create new collection automatically</SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Papers will be added to this collection. Leave empty to create a new collection.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Alert'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Active Queries Section */}
        <div className="space-y-4">
          {watchQueries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  Create your first alert to start discovering relevant papers automatically
                </p>
                <Button onClick={() => setShowCreateForm(true)} className="touch-manipulation h-11 sm:h-9">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            watchQueries.map((watchQuery) => (
              <Card key={watchQuery.id} className={!watchQuery.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                        <h3 className="font-semibold text-base truncate">{watchQuery.query}</h3>
                        <Badge variant={watchQuery.isActive ? 'default' : 'secondary'} className="text-xs">
                          {watchQuery.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] mb-2">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <Link
                            href={`/collections/${watchQuery.collection.id}`}
                            className="hover:text-[var(--foreground)] transition-colors"
                          >
                            {watchQuery.collection.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Last checked: {formatDate(watchQuery.lastCheckedAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                        <span>
                          {watchQuery._count.entries} paper{watchQuery._count.entries !== 1 ? 's' : ''} added
                        </span>
                        <span>
                          Created {new Date(watchQuery.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {watchQuery.isActive ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleQuery(watchQuery.id, watchQuery.isActive)}
                          disabled={togglingQuery === watchQuery.id}
                        >
                          {togglingQuery === watchQuery.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleQuery(watchQuery.id, watchQuery.isActive)}
                          disabled={togglingQuery === watchQuery.id}
                        >
                          {togglingQuery === watchQuery.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteQuery(watchQuery.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* How It Works Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>How Smart Alerts Work</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <h4 className="font-semibold">Daily Search</h4>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  We search for new papers matching your research interests every day
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <h4 className="font-semibold">AI Filtering</h4>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Gemini AI analyzes each paper for relevance to your specific interests
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <h4 className="font-semibold">Auto-Add & Notify</h4>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Relevant papers are added to your collection and you're notified
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
