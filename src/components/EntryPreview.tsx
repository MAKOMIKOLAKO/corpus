/**
 * EntryPreview component for displaying and editing entry metadata
 */

'use client';

import { useState } from 'react';
import { ContentType } from '@prisma/client';

interface Entry {
  id?: string;
  title: string;
  authors: string[];
  year?: number;
  summary: string;
  url?: string;
  doi?: string;
  source?: string;
  abstract?: string;
  contentType: ContentType;
}

interface EntryPreviewProps {
  entry: Entry;
  onSave?: (entry: Entry) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
}

export function EntryPreview({
  entry,
  onSave,
  onCancel,
  isLoading = false,
  showActions = true
}: EntryPreviewProps) {
  const [editedEntry, setEditedEntry] = useState<Entry>(entry);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    if (onSave) {
      onSave(editedEntry);
    }
  };

  const handleCancel = () => {
    setEditedEntry(entry);
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  const updateField = (field: keyof Entry, value: any) => {
    setEditedEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAuthors = (index: number, value: string) => {
    const newAuthors = [...editedEntry.authors];
    newAuthors[index] = value;
    updateField('authors', newAuthors);
  };

  const addAuthor = () => {
    updateField('authors', [...editedEntry.authors, '']);
  };

  const removeAuthor = (index: number) => {
    const newAuthors = editedEntry.authors.filter((_, i) => i !== index);
    updateField('authors', newAuthors);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Processing...</span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Entry' : 'Entry Preview'}
            </h3>
            {showActions && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEntry.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{editedEntry.title}</p>
              )}
            </div>

            {/* Authors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authors
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  {editedEntry.authors.map((author, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => updateAuthors(index, e.target.value)}
                        placeholder="Author name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {editedEntry.authors.length > 1 && (
                        <button
                          onClick={() => removeAuthor(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addAuthor}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Author
                  </button>
                </div>
              ) : (
                <p className="text-gray-900">
                  {editedEntry.authors.length > 0
                    ? editedEntry.authors.join(', ')
                    : 'No authors listed'
                  }
                </p>
              )}
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={editedEntry.year || ''}
                  onChange={(e) => updateField('year', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Publication year"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{editedEntry.year || 'No year specified'}</p>
              )}
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Summary
              </label>
              {isEditing ? (
                <textarea
                  value={editedEntry.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{editedEntry.summary || 'No summary available'}</p>
              )}
            </div>

            {/* URL/DOI/Source */}
            {(editedEntry.url || editedEntry.doi || editedEntry.source) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {editedEntry.url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <a
                      href={editedEntry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm truncate block"
                    >
                      {editedEntry.url}
                    </a>
                  </div>
                )}
                {editedEntry.doi && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DOI
                    </label>
                    <p className="text-gray-900 text-sm">{editedEntry.doi}</p>
                  </div>
                )}
                {editedEntry.source && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source
                    </label>
                    <p className="text-gray-900 text-sm">{editedEntry.source}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {isEditing && showActions && (
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EntryPreview;
