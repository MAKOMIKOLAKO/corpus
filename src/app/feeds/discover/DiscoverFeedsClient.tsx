'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Check } from 'lucide-react';
import { toast } from 'sonner';

type DefaultFeed = {
  id: string;
  name: string;
  url: string;
  category: string;
  description?: string | null;
};

type CategoryGroup = {
  name: string;
  feeds: DefaultFeed[];
};

type UserSubscription = {
  sourceId: string;
  defaultFeedId: string | null;
  isDefault: boolean;
  feedUrl: string;
};

const CATEGORY_ORDER = [
  'Research & Science News',
  'AI & Machine Learning',
  'Deep Tech & Research Labs',
  'Tech News',
  'Health & Medicine',
  'Trending Papers',
  'Global Affairs & Policy',
  'Ideas, Philosophy & Society'
] as const;

function normalizeComparisonUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const path = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${host}${path}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export default function DiscoverFeedsPage() {
  const [categories, setCategories] = React.useState<CategoryGroup[]>([]);
  const [subscribedDefaultIds, setSubscribedDefaultIds] = React.useState<Set<string>>(new Set());
  const [subscribedUrls, setSubscribedUrls] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [pendingFeedIds, setPendingFeedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const defaultsRes = await fetch('/api/rss/defaults');
        const defaultsData = await defaultsRes.json();

        if (!defaultsRes.ok) {
          throw new Error(defaultsData?.error || 'Failed to load default feeds');
        }

        const loadedCategories: CategoryGroup[] = Array.isArray(defaultsData?.categories)
          ? defaultsData.categories
          : [];

        setCategories(loadedCategories);

        const subscriptionsRes = await fetch('/api/rss/subscriptions');
        if (subscriptionsRes.ok) {
          setIsAuthenticated(true);
          const subsData = await subscriptionsRes.json();
          const defaults = Array.isArray(subsData?.defaults) ? subsData.defaults : [];
          const custom = Array.isArray(subsData?.custom) ? subsData.custom : [];
          const allSubs: UserSubscription[] = [...defaults, ...custom];

          const defaultIds = new Set<string>();
          const urls = new Set<string>();

          allSubs.forEach((sub) => {
            if (sub.defaultFeedId) {
              defaultIds.add(sub.defaultFeedId);
            }
            if (sub.feedUrl) {
              urls.add(normalizeComparisonUrl(sub.feedUrl));
            }
          });

          setSubscribedDefaultIds(defaultIds);
          setSubscribedUrls(urls);
        } else if (subscriptionsRes.status === 401) {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to load discover feeds data:', error);
        toast.error('Failed to load feed directory');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredCategories = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const ordered = CATEGORY_ORDER
      .map((categoryName) => categories.find((cat) => cat.name === categoryName))
      .filter((cat): cat is CategoryGroup => Boolean(cat));

    if (!normalizedQuery) {
      return ordered;
    }

    return ordered
      .map((category) => ({
        ...category,
        feeds: category.feeds.filter((feed) =>
          feed.name.toLowerCase().includes(normalizedQuery)
        )
      }))
      .filter((category) => category.feeds.length > 0);
  }, [categories, query]);

  const subscribeToDefaultFeed = React.useCallback(async (feed: DefaultFeed) => {
    if (!isAuthenticated) {
      return;
    }

    if (pendingFeedIds.has(feed.id)) {
      return;
    }

    setPendingFeedIds((prev) => new Set(prev).add(feed.id));

    try {
      const response = await fetch('/api/rss/subscribe/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultFeedId: feed.id })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok || response.status === 409) {
        setSubscribedDefaultIds((prev) => {
          const next = new Set(prev);
          next.add(feed.id);
          return next;
        });
        setSubscribedUrls((prev) => {
          const next = new Set(prev);
          next.add(normalizeComparisonUrl(feed.url));
          return next;
        });
        return;
      }

      throw new Error((data as { error?: string })?.error || 'Failed to subscribe');
    } catch (error) {
      console.error('Error subscribing to default feed:', error);
      toast.error('Could not subscribe to this feed');
    } finally {
      setPendingFeedIds((prev) => {
        const next = new Set(prev);
        next.delete(feed.id);
        return next;
      });
    }
  }, [isAuthenticated, pendingFeedIds]);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Discover Feeds</h1>
          <p className="text-muted-foreground">Subscribe to curated RSS feeds from top sources</p>
        </header>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((category) => (
                <a
                  key={category}
                  href={`#${encodeURIComponent(category)}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {category}
                </a>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search feeds"
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading curated feeds...</div>
        ) : (
          <div className="space-y-10">
            {filteredCategories.map((category) => (
              <section
                key={category.name}
                id={encodeURIComponent(category.name)}
                className="space-y-4 scroll-mt-28"
              >
                <h2 className="text-xl font-semibold tracking-tight">{category.name}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {category.feeds.map((feed) => {
                    const isSubscribed =
                      subscribedDefaultIds.has(feed.id) ||
                      subscribedUrls.has(normalizeComparisonUrl(feed.url));
                    const isPending = pendingFeedIds.has(feed.id);

                    return (
                      <div key={feed.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">{feed.name}</p>
                          <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {feed.category}
                          </span>
                          {feed.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3">{feed.description}</p>
                          )}
                        </div>

                        {!isAuthenticated ? (
                          <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            Subscribe
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubscribed || isPending}
                            onClick={() => void subscribeToDefaultFeed(feed)}
                            className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isSubscribed
                              ? 'bg-foreground text-background'
                              : 'border border-border text-foreground hover:bg-muted'
                              }`}
                          >
                            {isSubscribed ? (
                              <>
                                <Check size={12} className="mr-1" />
                                Subscribed ✓
                              </>
                            ) : isPending ? (
                              'Subscribing...'
                            ) : (
                              'Subscribe'
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
