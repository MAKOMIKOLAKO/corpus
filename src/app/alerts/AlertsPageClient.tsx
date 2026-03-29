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
        <Card key={i} className="border-2 animate-pulse">
          <CardContent className="p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-[var(--muted)] rounded flex-shrink-0"></div>
                  <div className="h-6 bg-[var(--muted)] rounded w-1/2"></div>
                  <div className="h-6 bg-[var(--muted)] rounded w-20"></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-5 bg-[var(--muted)] rounded w-1/3"></div>
                  <div className="h-5 bg-[var(--muted)] rounded w-1/4"></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-5 bg-[var(--muted)] rounded w-1/5"></div>
                  <div className="h-5 bg-[var(--muted)] rounded w-1/6"></div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-20 bg-[var(--muted)] rounded"></div>
                <div className="h-10 w-20 bg-[var(--muted)] rounded"></div>
              </div>
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
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Smart Alerts</h1>
              <p className="text-lg text-[var(--muted-foreground)]">Automatically discover relevant papers for your research interests</p>
            </div>
            <AlertsLoading />
          </div>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Smart Alerts</h1>
              <p className="text-lg text-[var(--muted-foreground)]">Automatically discover relevant papers for your research interests</p>
            </div>
            <UpgradeBanner
              message="Smart Alerts require a Pro plan. Get automatic paper discovery and intelligent filtering with Smart Alerts."
              ctaText="Upgrade to Pro"
            />
          </div>
        </div>
      </div>
    );
  }

  const activeQueryCount = watchQueries.filter(q => q.isActive).length;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Smart Alerts</h1>
              <p className="text-lg text-[var(--muted-foreground)]">Automatically discover relevant papers for your research interests</p>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={activeQueryCount >= MAX_QUERIES_PER_USER}
              size="lg"
              className="text-base px-6 h-12"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Alert
            </Button>
          </div>

          {/* Query Limit Indicator */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Your Active Alerts</h2>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {activeQueryCount} / {MAX_QUERIES_PER_USER}
              </Badge>
            </div>
            {activeQueryCount >= MAX_QUERIES_PER_USER && (
              <p className="text-base text-[var(--muted-foreground)]">
                You've reached the maximum number of active alerts. Deactivate an alert to create a new one.
              </p>
            )}
          </div>

          {/* Create New Alert Form */}
          {showCreateForm && (
            <Card className="border-2">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl">Create New Alert</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleCreateQuery} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="query" className="text-base font-medium">Research Interest</Label>
                    <textarea
                      id="query"
                      value={newQuery}
                      onChange={(e) => setNewQuery(e.target.value)}
                      placeholder="e.g., machine learning healthcare, quantum computing, climate change"
                      className="w-full mt-1 px-4 py-3 text-base border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Enter keywords or phrases describing your research interests
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="collection" className="text-base font-medium">Target Collection</Label>
                    <Select value={selectedCollectionId} onValueChange={(value) => setSelectedCollectionId(value || '')}>
                      <SelectTrigger className="h-12 px-4 text-base">
                        <SelectValue placeholder="Select a collection or create new" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Create new collection automatically</SelectItem>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id} className="text-base">
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Papers will be added to this collection. Leave empty to create a new collection.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={submitting} size="lg" className="flex-1 text-base h-12">
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Creating Alert...
                        </>
                      ) : (
                        'Create Alert'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      size="lg"
                      className="flex-1 text-base h-12"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Active Queries Section */}
          <div className="space-y-6">
            {watchQueries.length === 0 ? (
              <Card className="border-2">
                <CardContent className="py-16 text-center">
                  <Brain className="h-16 w-16 text-[var(--muted-foreground)] mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-3">No alerts yet</h3>
                  <p className="text-base text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                    Create your first alert to start discovering relevant papers automatically
                  </p>
                  <Button onClick={() => setShowCreateForm(true)} size="lg" className="text-base px-6 h-12">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Alert
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {watchQueries.map((watchQuery) => (
                  <Card key={watchQuery.id} className={`border-2 ${!watchQuery.isActive ? 'opacity-50' : ''}`}>
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0 space-y-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Search className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0" />
                            <h3 className="text-lg font-semibold">{watchQuery.query}</h3>
                            <Badge variant={watchQuery.isActive ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                              {watchQuery.isActive ? 'Active' : 'Paused'}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-6 text-base text-[var(--muted-foreground)]">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              <Link
                                href={`/collections/${watchQuery.collection.id}`}
                                className="hover:text-[var(--foreground)] transition-colors font-medium"
                              >
                                {watchQuery.collection.name}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-5 w-5" />
                              <span>Last checked: {formatDate(watchQuery.lastCheckedAt)}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-6 text-base text-[var(--muted-foreground)]">
                            <span className="font-medium">
                              {watchQuery._count.entries} paper{watchQuery._count.entries !== 1 ? 's' : ''} added
                            </span>
                            <span>
                              Created {new Date(watchQuery.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {watchQuery.isActive ? (
                            <Button
                              variant="secondary"
                              size="lg"
                              onClick={() => handleToggleQuery(watchQuery.id, watchQuery.isActive)}
                              disabled={togglingQuery === watchQuery.id}
                              className="h-10 px-4"
                            >
                              {togglingQuery === watchQuery.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Pause className="h-5 w-5" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => handleToggleQuery(watchQuery.id, watchQuery.isActive)}
                              disabled={togglingQuery === watchQuery.id}
                              className="h-10 px-4"
                            >
                              {togglingQuery === watchQuery.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Play className="h-5 w-5" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="lg"
                            onClick={() => handleDeleteQuery(watchQuery.id)}
                            className="h-10 px-4"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* How It Works Section */}
          <Card className="border-2">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6" />
                <CardTitle className="text-xl">How Smart Alerts Work</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-lg font-bold">
                      1
                    </div>
                    <h4 className="text-lg font-semibold">Daily Search</h4>
                  </div>
                  <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
                    We search for new papers matching your research interests every day
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-lg font-bold">
                      2
                    </div>
                    <h4 className="text-lg font-semibold">AI Filtering</h4>
                  </div>
                  <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
                    Gemini AI analyzes each paper for relevance to your specific interests
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-lg font-bold">
                      3
                    </div>
                    <h4 className="text-lg font-semibold">Auto-Add & Notify</h4>
                  </div>
                  <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
                    Relevant papers are added to your collection and you're notified
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
