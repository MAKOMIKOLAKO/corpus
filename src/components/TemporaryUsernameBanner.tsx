'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, X } from 'lucide-react';
import Link from 'next/link';

export default function TemporaryUsernameBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  // Check if user has a random username
  const isRandomUsername = session?.user?.username?.startsWith('user_');

  // Load dismissal state from localStorage on mount
  useEffect(() => {
    const dismissedState = localStorage.getItem('temp-username-banner-dismissed');
    if (dismissedState === 'true') {
      setDismissed(true);
    }
  }, []);

  // Save dismissal state to localStorage
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('temp-username-banner-dismissed', 'true');
  };

  // Don't show if user doesn't have a random username, not authenticated, or dismissed
  if (!session || !isRandomUsername || dismissed) {
    return null;
  }

  return (
    <div className="bg-green-50 dark:bg-green-950/20 border-b border-green-200 dark:border-green-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </span>
            <p className="text-sm text-green-800 dark:text-green-200">
              You&apos;re using a temporary username. You can change it in{' '}
              <Link href="/account/settings" className="font-medium underline hover:no-underline">
                settings
              </Link>
              .
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
