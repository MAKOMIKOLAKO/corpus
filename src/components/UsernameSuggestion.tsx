'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { setupUsername } from '@/app/setup-username/actions';
import { X, Edit3 } from 'lucide-react';

export default function UsernameSuggestion() {
  const { data: session, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; valid: boolean; message: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if user has a real username (not random), not authenticated, or dismissed
  if (!session || !session.user?.username || dismissed) {
    return null;
  }

  // Check if username is a random one
  const isRandomUsername = session.user.username.startsWith('user_');

  if (!isRandomUsername) {
    return null;
  }

  const checkAvailability = async (val: string) => {
    if (!val) { setAvailability(null); return; }
    setChecking(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(val)}`);
      const data = await res.json();
      setAvailability(data);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availability?.available) return;
    setSaving(true);
    try {
      const result = await setupUsername(username, bio);
      
      if (result.success) {
        await update();
        setIsOpen(false);
      } else {
        alert(result.error || 'Failed to update username');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You're using a temporary username. <button 
                onClick={() => setIsOpen(true)}
                className="font-medium underline hover:no-underline"
              >
                Choose a custom username
              </button>
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Choose your username</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={e => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                setUsername(val);
                if (val) checkAvailability(val);
              }}
              placeholder="yourhandle"
              maxLength={20}
              className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {availability && (
            <p className={`text-xs mt-1 ${availability.available ? 'text-green-600' : 'text-red-600'}`}>
              {availability.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Bio (optional)
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="A short description about you…"
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!availability?.available || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Update Username'}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
