"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bookmark,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  MessageSquare,
  Plus,
  User,
  UserPlus,
  Eye,
  Calendar,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReferenceRequestButton from "@/components/ReferenceRequestButton";
import { cn } from "@/lib/utils";

interface SignalEntry {
  id: string;
  title: string;
  contentType: string;
  topics: string[];
  authors: string[];
  year?: number;
}

interface SignalCollection {
  id: string;
  name: string;
  publicSlug?: string;
  isPublic: boolean;
}

interface SignalUser {
  id: string;
  username?: string;
  name?: string;
  plan: string;
}

interface Signal {
  id: string;
  type: string;
  createdAt: string;
  user: SignalUser;
  entry?: SignalEntry;
  collection?: SignalCollection;
  metadata: any;
}

interface SuggestedConnection {
  id: string;
  username: string;
  name?: string;
  mutualConnections: number;
}

interface ActiveCollection {
  id: string;
  name: string;
  ownerUsername: string;
  entryCount: number;
  viewCount: number;
  publicSlug: string;
}

const contentTypeLabels: Record<string, string> = {
  PAPER: "Paper",
  BLOG: "Blog",
  ESSAY: "Essay",
  ARTICLE: "Article",
  POLICY_REPORT: "Report",
  BOOK: "Book",
  VIDEO: "Video",
  SOCIAL_POST: "Post",
  OTHER: "Other"
};

const timeAgo = (date: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return "Just now";
};

export default function FeedClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "connections" | "mine">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<SignalEntry | null>(null);
  const [savingEntry, setSavingEntry] = useState<string | null>(null);
  const [suggestedConnections, setSuggestedConnections] = useState<SuggestedConnection[]>([]);
  const [activeCollections, setActiveCollections] = useState<ActiveCollection[]>([]);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/feed?filter=${filter}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSignals(Array.isArray(data.signals) ? data.signals : []);
        setUnreadCount(data.unreadCount || 0);
        setHasMore(data.hasMore || false);
        setPage(1);

        // Mark feed as viewed
        fetch('/api/feed', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastFeedViewedAt: new Date().toISOString() })
        });
      }
    } catch (error) {
      toast.error("Failed to load feed");
      setSignals([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchMoreSignals = useCallback(async () => {
    try {
      const response = await fetch(`/api/feed?filter=${filter}&limit=20&page=${page}`);
      if (response.ok) {
        const data = await response.json();
        const newSignals = Array.isArray(data.signals) ? data.signals : [];
        setSignals(prev => [...prev, ...newSignals]);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error("Failed to load more signals");
    }
  }, [filter, page]);

  useEffect(() => {
    fetchSignals();
    fetchSidebarData();
  }, [fetchSignals]);

  useEffect(() => {
    if (page > 1) {
      fetchMoreSignals();
    }
  }, [page, fetchMoreSignals]);

  const fetchSidebarData = async () => {
    // TODO: Implement suggested connections and active collections
    // For now, using placeholder data
    setSuggestedConnections([]);
    setActiveCollections([]);
  };

  const handleSaveEntry = async (entryId: string) => {
    setSavingEntry(entryId);
    try {
      // TODO: Implement save to library
      toast.success("Entry saved to your library");
    } catch (error) {
      toast.error("Failed to save entry");
    } finally {
      setSavingEntry(null);
    }
  };

  const renderSignalCard = (signal: Signal) => {
    const isOwnSignal = signal.user.id === session?.user?.id;

    switch (signal.type) {
      case "ENTRY_SAVED":
        return (
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-[var(--foreground)] mb-2">
                    <span className="font-medium">@{signal.user.username || signal.user.name}</span>
                    <span className="text-[var(--muted-foreground)]"> added a new entry</span>
                  </p>

                  {signal.entry && (
                    <>
                      <h4
                        className="font-medium text-[var(--foreground)] mb-1 cursor-pointer hover:text-[var(--primary)] transition-colors"
                        onClick={() => router.push(`/entries/${signal.entry!.id}?from=/feed`)}
                      >
                        {signal.entry.title}
                      </h4>
                      <p className="text-sm text-[var(--muted-foreground)] mb-2">
                        {Array.isArray(signal.entry.authors) ? signal.entry.authors.slice(0, 3).join(", ") : ""}
                        {Array.isArray(signal.entry.authors) && signal.entry.authors.length > 3 && " et al."}
                        {signal.entry.year && ` (${signal.entry.year})`}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {contentTypeLabels[signal.entry.contentType] || signal.entry.contentType}
                        </Badge>
                        {Array.isArray(signal.entry.topics) && signal.entry.topics.slice(0, 2).map(topic => (
                          <Badge key={topic} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="text-xs text-[var(--muted-foreground)]">
                    {timeAgo(signal.createdAt)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {signal.entry && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveEntry(signal.entry!.id)}
                        disabled={savingEntry === signal.entry!.id || isOwnSignal}
                      >
                        {savingEntry === signal.entry!.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      {!isOwnSignal && (
                        <ReferenceRequestButton
                          entry={signal.entry}
                          owner={{ id: signal.user.id, name: signal.user.name, username: signal.user.username }}
                          size="sm"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "ENTRY_ADDED_TO_COLLECTION":
        return (
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-[var(--foreground)] mb-2">
                    <span className="font-medium">@{signal.user.username || signal.user.name}</span>
                    <span className="text-[var(--muted-foreground)]"> added a paper to </span>
                    {signal.collection?.isPublic && signal.collection?.publicSlug ? (
                      <a
                        href={`/c/${signal.collection.publicSlug}`}
                        className="text-[var(--primary)] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {signal.collection.name}
                      </a>
                    ) : (
                      <span className="font-medium">{signal.collection?.name}</span>
                    )}
                  </p>

                  {signal.entry && (
                    <>
                      <h4 className="font-medium text-[var(--foreground)] mb-1">
                        {signal.entry.title}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {contentTypeLabels[signal.entry.contentType] || signal.entry.contentType}
                        </Badge>
                        {Array.isArray(signal.entry.topics) && signal.entry.topics.slice(0, 2).map(topic => (
                          <Badge key={topic} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="text-xs text-[var(--muted-foreground)]">
                    {timeAgo(signal.createdAt)}
                  </p>
                </div>

                {signal.entry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveEntry(signal.entry!.id)}
                    disabled={savingEntry === signal.entry!.id || isOwnSignal}
                  >
                    {savingEntry === signal.entry!.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case "COLLECTION_MADE_PUBLIC":
        return (
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-[var(--foreground)] mb-2">
                    <span className="font-medium">@{signal.user.username || signal.user.name}</span>
                    <span className="text-[var(--muted-foreground)]"> made their collection public: </span>
                    <span className="font-medium">{signal.metadata?.collectionName}</span>
                  </p>

                  {signal.metadata?.publicDescription && (
                    <p className="text-sm text-[var(--muted-foreground)] mb-2 italic">
                      &quot;{signal.metadata.publicDescription}&quot;
                    </p>
                  )}

                  <p className="text-xs text-[var(--muted-foreground)] mb-3">
                    {timeAgo(signal.createdAt)}
                  </p>

                  {signal.metadata?.publicSlug && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/c/${signal.metadata.publicSlug}`, '_blank', 'noopener,noreferrer')}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      View Collection
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "CONNECTION_MADE":
        return (
          <Card className="w-full">
            <CardContent className="p-4">
              <p className="text-sm text-[var(--foreground)]">
                <span className="font-medium">@{signal.user.username || signal.user.name}</span>
                <span className="text-[var(--muted-foreground)]"> accepted your connection request</span>
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                {timeAgo(signal.createdAt)}
              </p>
            </CardContent>
          </Card>
        );

      case "REFERENCE_REQUESTED":
        // Only show to sender and receiver
        if (!isOwnSignal && signal.metadata?.receiverUsername !== session?.user?.email?.split('@')[0]) {
          return null;
        }
        return (
          <Card className="w-full">
            <CardContent className="p-4">
              <p className="text-sm text-[var(--foreground)] mb-2">
                <span className="font-medium">@{signal.user.username || signal.user.name}</span>
                <span className="text-[var(--muted-foreground)]"> requested access to </span>
                <span className="font-medium">{signal.metadata?.entryTitle}</span>
              </p>

              {signal.metadata?.message && (
                <p className="text-sm text-[var(--muted-foreground)] mb-2 italic">
                  &quot;{signal.metadata.message}&quot;
                </p>
              )}

              <p className="text-xs text-[var(--muted-foreground)]">
                {timeAgo(signal.createdAt)}
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4">Research Signals</h1>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-[var(--border)]">
              {(["all", "connections", "mine"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
                    filter === f
                      ? "text-[var(--primary)] border-[var(--primary)]"
                      : "text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]"
                  )}
                >
                  {f}
                  {f === "all" && unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Signals List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-[var(--muted-foreground)]">Loading feed...</p>
              </div>
            ) : signals.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                <p className="text-[var(--muted-foreground)]">No signals yet</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  {filter === "mine"
                    ? "Your activity will appear here"
                    : filter === "connections"
                      ? "Your connections' activity will appear here"
                      : "Activity from you and your connections will appear here"
                  }
                </p>
              </div>
            ) : (
              <>
                {Array.isArray(signals) && signals.map((signal) => (
                  <div key={signal.id}>
                    {renderSignalCard(signal)}
                  </div>
                ))}

                {hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => p + 1)}
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Connections */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-[var(--foreground)] mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Suggested Connections
              </h3>

              {suggestedConnections.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No suggestions available
                </p>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(suggestedConnections) && suggestedConnections.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{conn.name || conn.username}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {conn.mutualConnections} mutual connections
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Public Collections */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-[var(--foreground)] mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Active Public Collections
              </h3>

              {activeCollections.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No active collections
                </p>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(activeCollections) && activeCollections.map((collection) => (
                    <div key={collection.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{collection.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          by @{collection.ownerUsername} · {collection.entryCount} entries · {collection.viewCount} views
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/c/${collection.publicSlug}`, '_blank', 'noopener,noreferrer')}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Entry Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEntry?.title}</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <p className="text-[var(--muted-foreground)]">
                {selectedEntry.authors.join(", ")}
                {selectedEntry.year && ` (${selectedEntry.year})`}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {contentTypeLabels[selectedEntry.contentType] || selectedEntry.contentType}
                </Badge>
                {selectedEntry.topics.map((topic) => (
                  <Badge key={topic} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveEntry(selectedEntry.id)}
                    disabled={savingEntry === selectedEntry.id}
                    className="flex-1"
                  >
                    {savingEntry === selectedEntry.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Save to my library
                      </>
                    )}
                  </Button>
                  {signals.find(s => s.entry?.id === selectedEntry.id && s.user.id !== session?.user?.id) && (
                    <ReferenceRequestButton
                      entry={selectedEntry}
                      owner={signals.find(s => s.entry?.id === selectedEntry.id)!.user}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
