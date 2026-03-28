/**
 * EntryInput component with toggle buttons for different input modes
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { InputMode } from '@/lib/entryQueue';
import { Search, Loader2 } from 'lucide-react';

interface SearchResult {
  key?: string;
  title: string;
  authors?: string[];
  author_name?: string[];
  year?: number;
  first_publish_year?: number;
  abstract?: string;
  venue?: string;
  url?: string;
  doi?: string;
  cover_i?: number;
}

interface EntryInputProps {
  onSubmit: (mode: InputMode, input: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EntryInput({ onSubmit, disabled = false }: EntryInputProps) {
  const [mode, setMode] = useState<InputMode>('link');
  const [input, setInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholders = {
    link: 'Paste a URL (e.g., https://example.com/article)',
    book: 'Enter book title (e.g., The Lean Startup)',
    paper: 'Enter research paper title (e.g., Attention Is All You Need)',
  };

  // Debounce search query
  useEffect(() => {
    if (mode === 'link') {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(input);
    }, 400);
    return () => clearTimeout(timer);
  }, [input, mode]);

  // Search when debounced query changes
  useEffect(() => {
    if ((mode === 'book' || mode === 'paper') && debouncedQuery.length >= 3) {
      handleSearch(debouncedQuery);
    } else if (debouncedQuery.length < 3) {
      setSearchResults([]);
      setSearchError(null);
    }
  }, [debouncedQuery, mode]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const endpoint = mode === 'book' ? '/api/search/books' : '/api/search/papers';
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.results || []);
        if (data.error) {
          setSearchError(data.error);
        }
      } else {
        setSearchError(data.error || 'Search failed');
      }
    } catch (error) {
      setSearchError('Search unavailable');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    // For books and papers, submit the selected result
    if (mode === 'book' && result.key) {
      onSubmit(mode, `https://openlibrary.org${result.key}`);
    } else if (mode === 'paper' && result.doi) {
      onSubmit(mode, result.doi);
    } else {
      // Fallback to title
      onSubmit(mode, result.title);
    }
    setSearchResults([]);
    setInput('');
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    onSubmit(mode, input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'link') {
        handleSubmit();
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Toggle Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('link')}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${mode === 'link'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          📎 Paste Link
        </button>
        <button
          onClick={() => setMode('book')}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${mode === 'book'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          📚 Book Title
        </button>
        <button
          onClick={() => setMode('paper')}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${mode === 'paper'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          📄 Paper Title
        </button>
      </div>

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type={mode === 'link' ? 'url' : 'text'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholders[mode]}
          disabled={disabled}
          className={`
            w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:bg-gray-50 disabled:text-gray-500
            ${(mode === 'book' || mode === 'paper') ? 'pl-10' : ''}
          `}
        />

        {/* Search icon for book/paper modes */}
        {(mode === 'book' || mode === 'paper') && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        )}

        {/* Submit Button (only for link mode) */}
        {mode === 'link' && (
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              px-4 py-1.5 bg-blue-600 text-white rounded-md
              hover:bg-blue-700 transition-colors
              disabled:bg-gray-300 disabled:cursor-not-allowed
            `}
          >
            Add
          </button>
        )}

        {/* Loading indicator */}
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          {searchResults.map((result, index) => (
            <div
              key={index}
              onClick={() => handleResultSelect(result)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <h4 className="font-medium text-gray-900">{result.title}</h4>
              <p className="text-sm text-gray-600">
                {(result.authors || result.author_name || [])?.slice(0, 3).join(', ')}
                {((result.authors || result.author_name || [])?.length || 0) > 3 && ' et al.'}
                {(result.year || result.first_publish_year) && ` · ${result.year || result.first_publish_year}`}
                {result.venue && ` · ${result.venue}`}
              </p>
              {result.cover_i && (
                <img
                  src={`https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg`}
                  alt="Book cover"
                  className="w-8 h-12 object-cover rounded float-right ml-2"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {input.length >= 3 && !isSearching && searchResults.length === 0 && !searchError && (mode === 'book' || mode === 'paper') && (
        <p className="mt-2 text-sm text-gray-500">
          No results found. Try different keywords.
        </p>
      )}

      {/* Error state */}
      {searchError && (
        <p className="mt-2 text-sm text-red-600">
          {searchError}
        </p>
      )}

      {/* Mode Description */}
      <p className="mt-2 text-sm text-gray-600">
        {mode === 'link' && 'Extract metadata from any web page using AI'}
        {mode === 'book' && 'Search Open Library for book information'}
        {mode === 'paper' && 'Search Semantic Scholar for research papers'}
      </p>
    </div>
  );
}

export default EntryInput;
