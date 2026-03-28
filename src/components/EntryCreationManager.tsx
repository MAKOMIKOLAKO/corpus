/**
 * EntryCreationManager - Orchestrates the entire entry creation flow
 */

'use client';

import { useState } from 'react';
import { EntryInput } from './EntryInput';
import { EntryPreview } from './EntryPreview';
import { useEntryCreation } from '@/hooks/useEntryCreation';
import { InputMode } from '@/lib/entryQueue';
import { QueueSubmission } from '@/lib/entryQueue';
import { Entry } from '@prisma/client';

export function EntryCreationManager() {
  const [createdEntries, setCreatedEntries] = useState<Entry[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  
  const { queue, stats, submitEntry, clearCompleted, isPolling } = useEntryCreation({
    onEntryCreated: (entry) => {
      setCreatedEntries(prev => [...prev, entry]);
    },
    onError: (error) => {
      setErrors(prev => [...prev, error]);
    },
  });

  const handleSubmit = (mode: InputMode, input: string) => {
    submitEntry(mode, input);
  };

  const removeError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Entry</h2>
        <EntryInput onSubmit={handleSubmit} disabled={isPolling} />
      </section>

      {/* Queue Status */}
      {stats.total > 0 && (
        <section className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Processing Queue</h3>
            {stats.completed > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear Completed
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-gray-500">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>

          {/* Queue Items */}
          <div className="mt-4 space-y-2">
            {queue.map((item: QueueSubmission) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'pending' ? 'bg-gray-400' :
                    item.status === 'processing' ? 'bg-blue-600 animate-pulse' :
                    item.status === 'completed' ? 'bg-green-600' :
                    'bg-red-600'
                  }`} />
                  <span className="text-sm text-gray-700 truncate max-w-md">
                    {item.input}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    ({item.mode})
                  </span>
                </div>
                <span className="text-xs text-gray-500 capitalize">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <section className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <p className="text-red-800 text-sm">{error}</p>
                <button
                  onClick={() => removeError(index)}
                  className="text-red-600 hover:text-red-700 ml-4"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Created Entries */}
      {createdEntries.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recently Added ({createdEntries.length})
          </h3>
          <div className="space-y-4">
            {createdEntries.map((entry) => (
              <EntryPreview
                key={entry.id}
                entry={{
                  id: entry.id,
                  title: entry.title,
                  authors: entry.authors,
                  year: entry.year || undefined,
                  summary: entry.summary || '',
                  url: entry.url || undefined,
                  doi: entry.doi || undefined,
                  source: entry.source || undefined,
                  abstract: entry.abstract || undefined,
                  contentType: entry.contentType,
                }}
                showActions={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Loading Indicator */}
      {isPolling && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm">Processing entries...</span>
        </div>
      )}
    </div>
  );
}
