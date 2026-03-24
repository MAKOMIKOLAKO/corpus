'use client';

import { useEffect, useState } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

const SCROLL_POSITION_KEY = 'scroll-position';

export function useScrollPosition(key: string = 'default') {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });

  // Save scroll position
  const saveScrollPosition = () => {
    const position = { x: window.scrollX, y: window.scrollY };
    setScrollPosition(position);
    
    // Store in sessionStorage
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    positions[key] = position;
    sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
  };

  // Restore scroll position
  const restoreScrollPosition = () => {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    const position = positions[key];
    
    if (position && (position.x > 0 || position.y > 0)) {
      window.scrollTo(position.x, position.y);
      setScrollPosition(position);
    }
  };

  // Clear scroll position
  const clearScrollPosition = () => {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    delete positions[key];
    sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
    setScrollPosition({ x: 0, y: 0 });
  };

  // Auto-save on scroll
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(saveScrollPosition, 100); // Debounce
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [key]);

  // Restore on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(restoreScrollPosition, 50);
    return () => clearTimeout(timeoutId);
  }, [key]);

  return {
    scrollPosition,
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition
  };
}
