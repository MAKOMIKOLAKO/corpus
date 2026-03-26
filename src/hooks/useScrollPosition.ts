'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

const SCROLL_POSITION_KEY = 'scroll-position';

/** Persist current window scroll for a named key (call before navigating away, e.g. from a Link onClick). */
export function saveScrollPositionForKey(key: string) {
  if (typeof window === 'undefined') return;
  const position = { x: window.scrollX, y: window.scrollY };
  const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
  positions[key] = position;
  sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
}

export function useScrollPosition(key: string = 'default') {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
  const restoringRef = useRef(false);

  const saveScrollPosition = () => {
    const position = { x: window.scrollX, y: window.scrollY };
    setScrollPosition(position);

    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    positions[key] = position;
    sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
  };

  const restoreScrollPosition = () => {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    const position = positions[key];

    if (position && (position.x > 0 || position.y > 0)) {
      window.scrollTo(position.x, position.y);
      setScrollPosition(position);
    }
  };

  const clearScrollPosition = () => {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    delete positions[key];
    sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
    setScrollPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      if (restoringRef.current) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (restoringRef.current) return;
        const position = { x: window.scrollX, y: window.scrollY };
        setScrollPosition(position);
        const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
        positions[key] = position;
        sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [key]);

  // Restore after navigation (back/forward) or full reload.
  // Uses a height-aware rAF loop to wait for async content before scrolling.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    const position = positions[key];
    if (!position || (position.x === 0 && position.y === 0)) return;

    const targetY = position.y;
    restoringRef.current = true;
    let rafId: number;
    let disposed = false;

    const restore = () => {
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
      setScrollPosition(position);
    };

    // Safety: stop polling after 3 seconds
    const safetyTimeout = setTimeout(() => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(rafId);
      // Last-ditch attempt even if page isn't fully tall enough
      restore();
      restoringRef.current = false;
    }, 3000);

    const check = () => {
      if (disposed) return;

      if (document.documentElement.scrollHeight >= targetY) {
        restore();
        disposed = true;
        clearTimeout(safetyTimeout);
        // Keep restoring flag a bit longer to beat any Next.js scroll-to-top
        setTimeout(() => { restoringRef.current = false; }, 200);
        return;
      }

      rafId = requestAnimationFrame(check);
    };

    // Try immediately in case content is already rendered
    restore();
    rafId = requestAnimationFrame(check);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(safetyTimeout);
      restoringRef.current = false;
    };
  }, [key]);

  return {
    scrollPosition,
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition
  };
}
