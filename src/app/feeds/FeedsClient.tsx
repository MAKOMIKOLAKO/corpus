'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink, Rss, Clock, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { AddFeedDialog } from './AddFeedDialog';

interface Feed {
  id: string;
  feedUrl: string;
  title: string | null;
  domain: string;
  lastFetchedAt: Date | null;
  addedAt: Date;
}

interface FeedsClientProps {
  feeds: Feed[];
}

export default function FeedsClient({ feeds }: FeedsClientProps) {
  const [feedList, setFeedList] = useState(feeds);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemoveFeed = async (feedId: string) => {
    setRemoving(feedId);
    
    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove feed');
      }

      setFeedList(prev => prev.filter(f => f.id !== feedId));
      toast.success('Feed removed successfully');
    } catch (error) {
      console.error('Error removing feed:', error);
      toast.error('Failed to remove feed');
    } finally {
      setRemoving(null);
    }
  };

  const handleAddFeed = (newFeed: any) => {
    setFeedList(prev => [newFeed, ...prev]);
    setIsAddDialogOpen(false);
    toast.success('Feed added successfully');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">RSS Feeds</h1>
          <p className="text-muted-foreground mt-2">
            Manage your RSS feed subscriptions. New articles are automatically discovered daily.
          </p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Add Feed
        </button>
      </div>

      {feedList.length === 0 ? (
        <div className="text-center py-12">
          <Rss size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No feeds yet</h3>
          <p className="text-muted-foreground mb-6">
            Add your first RSS feed to start discovering new content
          </p>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Add Your First Feed
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {feedList.map(feed => (
            <div
              key={feed.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Rss size={16} className="text-muted-foreground" />
                    <h3 className="font-semibold text-foreground truncate">
                      {feed.title || feed.domain}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {feed.domain}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      Added {formatDistanceToNow(new Date(feed.addedAt), { addSuffix: true })}
                    </div>
                    {feed.lastFetchedAt && (
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        Last fetched {formatDistanceToNow(new Date(feed.lastFetchedAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={feed.feedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => handleRemoveFeed(feed.id)}
                    disabled={removing === feed.id}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddFeedDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onFeedAdded={handleAddFeed}
      />
    </div>
  );
}
