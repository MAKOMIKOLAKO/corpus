'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { RESEARCH_INTERESTS, INTEREST_CATEGORIES, getInterestsByCategory } from '@/lib/researchInterests';
import { Check, X, Search, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

type Step = 'interests' | 'feeds';

interface DefaultFeed {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

interface GroupedFeeds {
  [category: string]: DefaultFeed[];
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>('interests');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [feeds, setFeeds] = useState<GroupedFeeds | null>(null);
  const [feedsLoading, setFeedsLoading] = useState(false);
  const [feedsError, setFeedsError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already onboarded
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.onboardingCompleted) {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch default feeds when moving to step 2
  useEffect(() => {
    if (step === 'feeds' && !feeds) {
      fetchFeeds();
    }
  }, [step, feeds]);

  const fetchFeeds = async () => {
    setFeedsLoading(true);
    setFeedsError(null);
    try {
      const res = await fetch('/api/rss/defaults');
      if (!res.ok) throw new Error('Failed to fetch feeds');
      const data = await res.json();
      setFeeds(data.grouped || {});
    } catch (error) {
      console.error('Failed to fetch feeds:', error);
      setFeedsError('Could not load feeds. Please try again.');
    } finally {
      setFeedsLoading(false);
    }
  };

  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter((id) => id !== interestId));
    } else if (selectedInterests.length < 10) {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  const toggleFeed = (feedId: string) => {
    if (selectedFeedIds.includes(feedId)) {
      setSelectedFeedIds(selectedFeedIds.filter((id) => id !== feedId));
    } else {
      setSelectedFeedIds([...selectedFeedIds, feedId]);
    }
  };

  const selectAllInCategory = () => {
    if (activeCategory === 'All' || !feeds) return;
    const categoryFeeds = feeds[activeCategory] || [];
    const newIds = categoryFeeds.map((f) => f.id).filter((id) => !selectedFeedIds.includes(id));
    setSelectedFeedIds([...selectedFeedIds, ...newIds]);
  };

  const handleSkip = async () => {
    await completeOnboarding([], []);
  };

  const handleComplete = async () => {
    await completeOnboarding(selectedInterests, selectedFeedIds);
  };

  const completeOnboarding = async (interests: string[], feedIds: string[]) => {
    setCompleting(true);
    setCompletionError(null);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedInterests: interests,
          selectedFeedIds: feedIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      router.push('/');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setCompletionError(error instanceof Error ? error.message : 'Failed to complete onboarding');
    } finally {
      setCompleting(false);
    }
  };

  if (!mounted) return null;

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-content-tertiary" />
      </div>
    );
  }

  const interestsByCategory = getInterestsByCategory();
  const filteredInterests = searchQuery
    ? RESEARCH_INTERESTS.filter((i) =>
        i.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (activeCategory === 'All'
        ? RESEARCH_INTERESTS
        : interestsByCategory[activeCategory] || []);

  const feedCategories = feeds ? Object.keys(feeds) : [];
  const activeFeeds = activeCategory === 'All' || !feeds
    ? Object.values(feeds || {}).flat()
    : feeds[activeCategory] || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Indicator */}
      <div className="border-b border-border/50 bg-surface-sunken py-4">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  step === 'interests' ? 'bg-accent' : 'bg-accent'
                }`}
              />
              <div
                className={`w-16 h-0.5 transition-colors ${
                  step === 'feeds' ? 'bg-accent' : 'bg-border'
                }`}
              />
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  step === 'feeds' ? 'bg-accent' : 'bg-border'
                }`}
              />
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-content-secondary hover:text-content-primary transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl animate-in fade-in duration-400">
          {step === 'interests' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-serif font-medium text-content-primary">
                  What do you research?
                </h1>
                <p className="text-content-secondary body-standard">
                  Select up to 10 topics to personalize your discovery feed. You can change these anytime in Settings.
                </p>
                <p className="text-sm text-content-tertiary">
                  {selectedInterests.length} / 10 selected
                  {selectedInterests.length === 10 && (
                    <span className="ml-2 text-accent">— maximum reached</span>
                  )}
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topics..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-secondary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveCategory('All')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === 'All'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                  }`}
                >
                  All
                </button>
                {INTEREST_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeCategory === category
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Interest Chips */}
              {filteredInterests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-content-secondary">No topics match &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredInterests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest.id);
                    const isMaxed = selectedInterests.length >= 10 && !isSelected;
                    return (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        disabled={isMaxed}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                        } ${isMaxed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                      >
                        {isSelected && <Check className="inline w-3 h-3 mr-1" />}
                        {interest.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Continue Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setStep('feeds')}
                  disabled={selectedInterests.length === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed button-terracotta"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'feeds' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-serif font-medium text-content-primary">
                  Follow research sources
                </h1>
                <p className="text-content-secondary body-standard">
                  Subscribe to RSS feeds from journals, blogs, and news sources. Skip this if you prefer to add feeds later.
                </p>
                <p className="text-sm text-content-tertiary">
                  {selectedFeedIds.length} feed{selectedFeedIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              {feedsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                  <p className="text-content-secondary">Loading feeds...</p>
                </div>
              ) : feedsError ? (
                <div className="text-center py-12">
                  <p className="text-content-secondary">{feedsError}</p>
                  <button
                    onClick={fetchFeeds}
                    className="mt-4 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Category Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => setActiveCategory('All')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        activeCategory === 'All'
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                      }`}
                    >
                      All
                    </button>
                    {feedCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          activeCategory === category
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* Select All in Category */}
                  {activeCategory !== 'All' && feeds && feeds[activeCategory]?.length > 0 && (
                    <button
                      onClick={selectAllInCategory}
                      className="text-sm text-content-secondary hover:text-content-primary transition-colors"
                    >
                      Select all in {activeCategory}
                    </button>
                  )}

                  {/* Feed Cards */}
                  <div className="space-y-3">
                    {activeFeeds.map((feed) => {
                      const isSelected = selectedFeedIds.includes(feed.id);
                      return (
                        <button
                          key={feed.id}
                          onClick={() => toggleFeed(feed.id)}
                          className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                            isSelected
                              ? 'border-accent bg-card'
                              : 'border-border bg-surface-raised hover:border-border-strong'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-content-primary truncate">
                                {feed.name}
                              </h3>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-surface-sunken text-content-tertiary">
                                {feed.category}
                              </span>
                              {feed.description && (
                                <p className="mt-2 text-sm text-content-secondary line-clamp-2">
                                  {feed.description}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                                <Check className="w-4 h-4 text-accent-foreground" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Error Message */}
                  {completionError && (
                    <div className="text-center py-4">
                      <p className="text-error text-sm">{completionError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep('interests')}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-raised text-content-secondary hover:text-content-primary transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed button-terracotta"
                    >
                      {completing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Finishing...
                        </>
                      ) : (
                        <>
                          Finish Setup
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Skip Note */}
      <div className="py-4 text-center">
        <p className="text-xs text-content-tertiary">
          You can update these in Settings.
        </p>
      </div>
    </div>
  );
}
