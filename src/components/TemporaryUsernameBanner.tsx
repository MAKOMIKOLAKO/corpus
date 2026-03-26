'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, X, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TemporaryUsernameBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [bannerShown, setBannerShown] = useState(false);
  const [usernameJustChanged, setUsernameJustChanged] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has a random username or no username
  const isRandomUsername = session?.user?.username?.startsWith('user_');
  const hasNoUsername = !session?.user?.username;
  const shouldShow = isRandomUsername || hasNoUsername;

  // Load dismissal state and check if banner was shown
  useEffect(() => {
    if (!session) return;

    // Check if banner was already dismissed from server
    const checkBannerStatus = async () => {
      try {
        const res = await fetch('/api/user/username-banner-status');
        const data = await res.json();

        // Check if username was just changed (not random and banner was shown)
        if (!session.user.username?.startsWith('user_') && data.bannerShown) {
          setUsernameJustChanged(true);
          // Mark banner as dismissed on server since user now has a proper username
          await fetch('/api/user/username-banner-dismiss', { method: 'POST' });
          setLoading(false);
          return;
        }

        if (data.bannerShown) {
          setDismissed(true);
        } else if (shouldShow && !data.bannerShown && !usernameJustChanged) {
          setBannerShown(true);
        }
      } catch (error) {
        console.error('Failed to check banner status:', error);
        // Fallback to localStorage for existing users
        const dismissedState = localStorage.getItem('temp-username-banner-dismissed');
        if (dismissedState === 'true') {
          setDismissed(true);
        } else if (shouldShow && !usernameJustChanged) {
          setBannerShown(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkBannerStatus();
  }, [session, shouldShow, usernameJustChanged]);

  // Handle dismissal
  const handleDismiss = async () => {
    setDismissed(true);
    setBannerShown(false);

    // Save to server
    try {
      await fetch('/api/user/username-banner-dismiss', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to dismiss banner:', error);
      // Fallback to localStorage
      localStorage.setItem('temp-username-banner-dismissed', 'true');
    }
  };

  // Don't show if not authenticated, has a proper username, or dismissed, or still loading
  if (!session || !shouldShow || dismissed || loading) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {hasNoUsername ? (
                <span>
                  <span className="font-medium">Welcome to Corpus!</span> Personalize your profile by setting a unique username that others can use to find you.
                </span>
              ) : (
                <span>
                  You&apos;re using a temporary username. You can change it to something more personal in settings.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Link href="/account/settings#username">
              <Button
                size="sm"
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Settings className="h-4 w-4 mr-1" />
                {hasNoUsername ? 'Set Username' : 'Change Username'}
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
