'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

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
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
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

  // Restore after navigation (back/forward) or full reload. Re-run a few times so we win over Next.js scroll-to-top.
  useLayoutEffect(() => {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    const position = positions[key];
    if (!position || (position.x === 0 && position.y === 0)) return;

    const restore = () => {
      window.scrollTo(position.x, position.y);
      setScrollPosition(position);
    };

    restore();
    const raf = requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    const t0 = setTimeout(restore, 0);
    const t1 = setTimeout(restore, 100);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, [key]);

  return {
    scrollPosition,
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition
  };
}
