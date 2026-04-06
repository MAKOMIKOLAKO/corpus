'use client';

import React, { useState } from 'react';
import { Plus, Loader2, ExternalLink, Rss, Globe, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface FeedPreview {
  feedUrl: string;
  title: string | null;
  description: string | null;
  domain: string;
  items: Array<{
    title: string;
    url: string | null;
    publishedDate: Date | null;
  }>;
}

interface AddFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeedAdded: (feed: {
    id: string;
    feedUrl: string;
    title: string | null;
    domain: string;
  }) => void;
}

export function AddFeedDialog({ open, onOpenChange, onFeedAdded }: AddFeedDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<FeedPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch('/api/feeds/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to discover feed');
        return;
      }

      setPreview(data);
    } catch (error) {
      console.error('Error discovering feed:', error);
      setError('Failed to discover feed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async () => {
    if (!preview) return;

    setLoading(true);

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: preview.feedUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('You have already added this feed');
        } else {
          setError(data.error || 'Failed to add feed');
        }
        return;
      }

      onFeedAdded(data.feed);
      setUrl('');
      setPreview(null);
    } catch (error) {
      console.error('Error adding feed:', error);
      setError('Failed to add feed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setPreview(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add RSS Feed</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="url">Website or RSS Feed URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com or https://example.com/feed.xml"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
              />
              <Button
                onClick={handleDiscover}
                disabled={loading || !url.trim()}
                variant="outline"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Globe size={16} className="mr-2" />
                    Discover
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          {preview && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Rss size={16} />
                  Feed Preview
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-1">
                    {preview.title || preview.domain}
                  </h4>
                  {preview.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {preview.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Domain: {preview.domain}
                  </p>
                </div>
              </div>

              {preview.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recent Items</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {preview.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium text-foreground truncate">
                            {item.title}
                          </h5>
                          {item.publishedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(item.publishedDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleAddFeed} disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <Plus size={16} className="mr-2" />
                  )}
                  Add Feed
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
