'use client';

import { useState } from 'react';
import { Youtube, Plus } from 'lucide-react';

interface QuickAddYouTubeEntryProps {
  onEntryAdded: (entry: any) => void;
}

export default function QuickAddYouTubeEntry({ onEntryAdded }: QuickAddYouTubeEntryProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'corpus-api-key-2024-secure-string'
        },
        body: JSON.stringify({
          url: url.trim(),
          contentType: 'VIDEO',
          skipAI: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add YouTube entry');
      }

      const entry = await response.json();
      onEntryAdded(entry);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add YouTube entry');
    } finally {
      setLoading(false);
    }
  };

  const isValidYouTubeUrl = (url: string) => {
    const patterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /youtube\.com\/embed\//,
      /youtube\.com\/shorts\//
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Youtube className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-gray-900">Add YouTube Video</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          {url && !isValidYouTubeUrl(url) && (
            <p className="text-red-500 text-sm mt-1">Please enter a valid YouTube URL</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim() || !isValidYouTubeUrl(url)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Adding Video...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add YouTube Video
            </>
          )}
        </button>
      </form>

      <div className="mt-3 text-xs text-gray-500">
        Supports regular videos, shorts, and embedded YouTube URLs
      </div>
    </div>
  );
}
