'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, FileText, Loader2, Trash2, Search, Brain, Bell, Play, Pause, Sparkles } from 'lucide-react';
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
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            <Sparkles className="h-3.5 w-3.5" />
            Smart discovery
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Smart Alerts</h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Automatically discover relevant papers for your research interests and route them into the right collection.
            </p>
          </div>
        </div>
        <AlertsLoading />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            <Sparkles className="h-3.5 w-3.5" />
            Smart discovery
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Smart Alerts</h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Automatically discover relevant papers for your research interests and route them into the right collection.
            </p>
          </div>
        </div>
        <UpgradeBanner
          message="Smart Alerts require a Pro plan. Get automatic paper discovery and intelligent filtering with Smart Alerts."
          ctaText="Upgrade to Pro"
        />
      </div>
    );
  }

  const activeQueryCount = watchQueries.filter(q => q.isActive).length;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted)]/30 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)]/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              <Sparkles className="h-3.5 w-3.5" />
              Smart discovery
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">Smart Alerts</h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
                Automatically discover relevant papers for your research interests, filter them for relevance, and send them straight into the right collection.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--background)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {activeQueryCount} of {MAX_QUERIES_PER_USER} active alerts used
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={activeQueryCount >= MAX_QUERIES_PER_USER}
              size="lg"
              className="h-11 gap-2 px-5"
            >
              <Plus className="h-4 w-4" />
              Create Alert
            </Button>
          </div>
        </div>
      </section>

      {activeQueryCount >= MAX_QUERIES_PER_USER && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
            <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
              You’ve reached the maximum number of active alerts. Pause or deactivate one to create another.
            </p>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card className="border-[var(--border)] shadow-sm">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-xl font-semibold">Create a new alert</CardTitle>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Define a topic you care about and choose where matching papers should be saved.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateQuery} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="query">Research interest</Label>
                <Textarea
                  id="query"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="Examples: spatial transcriptomics breast cancer, protein language models, digital phenotyping psychiatry"
                  rows={4}
                  maxLength={500}
                  className="px-3 py-2.5 text-sm"
                />
                <p className="text-sm text-[var(--muted-foreground)]">
                  Use keywords, methods, diseases, or domains you want Corpus to monitor for you.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection">Target collection</Label>
                <Select value={selectedCollectionId} onValueChange={(value) => setSelectedCollectionId(value || '')}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a collection or create a new one automatically" />
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
                <p className="text-sm text-[var(--muted-foreground)]">
                  Matching papers will be added here. If you leave this blank, Corpus will create a new collection for the alert.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="h-11"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-11 gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating alert...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Alert
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Your alerts</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Monitor topics, route results into collections, and manage alert activity.</p>
          </div>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            {watchQueries.length} total
          </Badge>
        </div>

        {watchQueries.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--muted-foreground)]">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">No alerts yet</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                Create your first alert to continuously surface new papers in the topics you care about most.
              </p>
              <Button onClick={() => setShowCreateForm(true)} className="mt-6 h-11 gap-2">
                <Plus className="h-4 w-4" />
                Create your first alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {watchQueries.map((watchQuery) => (
              <Card key={watchQuery.id} className={`${!watchQuery.isActive ? 'opacity-70' : ''} border-[var(--border)] shadow-sm transition-colors hover:border-[var(--muted-foreground)]/20`}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)]">
                          <Search className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold leading-6 text-[var(--foreground)] sm:text-lg">{watchQuery.query}</h3>
                        <Badge variant={watchQuery.isActive ? 'default' : 'secondary'} className="px-2.5 py-0.5 text-xs">
                          {watchQuery.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </div>

                      <div className="grid gap-3 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <Link
                            href={`/collections/${watchQuery.collection.id}`}
                            className="truncate font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                          >
                            {watchQuery.collection.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Last checked {formatDate(watchQuery.lastCheckedAt)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-[var(--foreground)]">{watchQuery._count.entries}</span> papers added
                        </div>
                        <div>
                          Created {new Date(watchQuery.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <Button
                        variant={watchQuery.isActive ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleQuery(watchQuery.id, watchQuery.isActive)}
                        disabled={togglingQuery === watchQuery.id}
                        className="h-9 gap-2"
                      >
                        {togglingQuery === watchQuery.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : watchQuery.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {watchQuery.isActive ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteQuery(watchQuery.id)}
                        className="h-9 gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card className="border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--foreground)]">
              <Bell className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg font-semibold">How Smart Alerts work</CardTitle>
          </div>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Smart Alerts run in the background so your library keeps growing without manual searching.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold">1</div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Search daily</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Corpus checks for newly published papers matching your alert terms every day.</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold">2</div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Filter for relevance</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Relevant results are screened before they are added, reducing noise and duplicates.</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold">3</div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Save and notify</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Matching papers are saved to your chosen collection and surfaced through notifications.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
