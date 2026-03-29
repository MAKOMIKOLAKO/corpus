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
import { Plus, Calendar, FileText, Loader2, Trash2, Search, Brain, Bell, CheckCircle, XCircle } from 'lucide-react';
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

export default function AlertsPageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const apikey = useApiKey();

  const [watchQueries, setWatchQueries] = useState<WatchQuery[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm('Are you sure you want to deactivate this alert?')) return;

    try {
      const response = await fetch(`/api/watch-queries/${queryId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apikey || '',
        },
      });

      if (!response.ok) throw new Error('Failed to deactivate alert');

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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Smart Alerts</h1>
          <p className="text-muted-foreground">Automatically discover relevant papers for your research interests</p>
        </div>
        <UpgradeBanner
          message="Smart Alerts require a Pro plan. Get automatic paper discovery and intelligent filtering with Smart Alerts."
          ctaText="Upgrade to Pro"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Smart Alerts</h1>
        <p className="text-muted-foreground">
          Automatically discover relevant papers for your research interests
        </p>
      </div>

      <div className="mb-6">
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={watchQueries.filter(q => q.isActive).length >= MAX_QUERIES_PER_USER}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Alert
        </Button>
        {watchQueries.filter(q => q.isActive).length >= MAX_QUERIES_PER_USER && (
          <p className="text-sm text-muted-foreground mt-2">
            Maximum of {MAX_QUERIES_PER_USER} active alerts reached
          </p>
        )}
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateQuery} className="space-y-4">
              <div>
                <Label htmlFor="query">Search Query</Label>
                <Input
                  id="query"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="e.g., machine learning healthcare, quantum computing, climate change"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
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
                <p className="text-sm text-muted-foreground mt-1">
                  Papers will be added to this collection. Leave empty to create a new collection.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {watchQueries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first alert to start discovering relevant papers automatically
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          watchQueries.map((watchQuery) => (
            <Card key={watchQuery.id} className={!watchQuery.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{watchQuery.query}</h3>
                      <Badge variant={watchQuery.isActive ? 'default' : 'secondary'}>
                        {watchQuery.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <Link
                          href={`/collections/${watchQuery.collection.id}`}
                          className="hover:text-foreground"
                        >
                          {watchQuery.collection.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Last checked: {formatDate(watchQuery.lastCheckedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {watchQuery._count.entries} papers added
                      </span>
                      <span className="text-muted-foreground">
                        Created {new Date(watchQuery.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {watchQuery.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuery(watchQuery.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5" />
          <h4 className="font-semibold">How Smart Alerts Work</h4>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Daily search for new papers matching your query</li>
          <li>• AI-powered relevance filtering using Gemini</li>
          <li>• Automatic deduplication to prevent duplicates</li>
          <li>• Papers added to your selected collection</li>
          <li>• Notifications when new papers are discovered</li>
        </ul>
      </div>
    </div>
  );
}
