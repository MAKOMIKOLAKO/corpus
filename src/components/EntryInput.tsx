/**
 * EntryInput component with toggle buttons for different input modes
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { InputMode } from '@/lib/entryQueue';

interface EntryInputProps {
  onSubmit: (mode: InputMode, input: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EntryInput({ onSubmit, disabled = false }: EntryInputProps) {
  const [mode, setMode] = useState<InputMode>('link');
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholders = {
    link: 'Paste a URL (e.g., https://example.com/article)',
    book: 'Enter book title (e.g., The Lean Startup)',
    paper: 'Enter research paper title (e.g., Attention Is All You Need)',
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
      handleSubmit();
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
            px-4 -py-2 rounded-lg font-medium transition-colors
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
          `}
        />

        {/* Submit Button */}
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
      </div>

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
