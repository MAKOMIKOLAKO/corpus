'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { RESEARCH_INTERESTS, INTEREST_CATEGORIES, getInterestsByCategory } from '@/lib/researchInterests';
import { Check, X, Search, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already onboarded (hard nav ensures middleware sees the current JWT)
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.onboardingCompleted) {
      window.location.href = '/research';
    }
  }, [status, session]);

  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter((id) => id !== interestId));
    } else if (selectedInterests.length < 10) {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding([]);
  };

  const handleComplete = async () => {
    await completeOnboarding(selectedInterests);
  };

  const completeOnboarding = async (interests: string[]) => {
    setCompleting(true);
    setCompletionError(null);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedInterests: interests,
          selectedFeedIds: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Update session JWT, then hard-navigate so middleware reads the fresh cookie
      await update();
      window.location.href = '/research';
      // Don't reset completing — we're navigating away
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setCompletionError(error instanceof Error ? error.message : 'Failed to complete onboarding');
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Skip */}
      <div className="border-b border-border/50 bg-surface-sunken py-4">
        <div className="max-w-3xl mx-auto px-4 flex justify-end">
          <button
            onClick={handleSkip}
            className="text-sm text-content-secondary hover:text-content-primary transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl animate-in fade-in duration-400 space-y-6">
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
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === 'All'
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
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === category
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Continue Button at Top */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleComplete}
              disabled={completing || selectedInterests.length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed button-terracotta"
            >
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finishing...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
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
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isSelected
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

          {/* Error Message */}
          {completionError && (
            <div className="text-center py-4">
              <p className="text-error text-sm">{completionError}</p>
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
