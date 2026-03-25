// Accessibility utilities and hooks

import { useEffect, useRef } from 'react';
import { createElement } from 'react';

// Custom hook for announcing messages to screen readers
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = message;

      // Clear the message after announcement
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const AnnouncerComponent = () => {
    return createElement('div', {
      ref: announcerRef,
      className: 'sr-only',
      'aria-live': 'polite',
      'aria-atomic': 'true'
    });
  };

  return { announce, AnnouncerComponent };
}

// Custom hook for focus management
export function useFocusManagement() {
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      firstFocusableRef.current = focusableElements[0] as HTMLElement;
      lastFocusableRef.current = focusableElements[focusableElements.length - 1] as HTMLElement;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableRef.current) {
          event.preventDefault();
          lastFocusableRef.current?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          event.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    }
  };

  return { trapFocus, handleKeyDown };
}

// Utility for generating unique IDs
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

// Utility for checking color contrast (simplified version)
export function getContrastRatio(color1: string, color2: string): number {
  // This is a simplified version - in production, you'd want a more robust solution
  // For now, return a placeholder value
  return 4.5; // WCAG AA compliant
}

// Utility for creating accessible descriptions
export function createDescribedBy(ids: (string | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

// Keyboard navigation constants
export const KEYS = {
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
} as const;

// ARIA roles
export const ARIA_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  NAVIGATION: 'navigation',
  MAIN: 'main',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  SEARCH: 'search',
  ALERT: 'alert',
  DIALOG: 'dialog',
  LISTBOX: 'listbox',
  OPTION: 'option',
  COMBOBOX: 'combobox',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  SEPARATOR: 'separator',
} as const;

// Common accessibility testing utilities
export const a11yChecks = {
  hasAltText: (img: HTMLImageElement) => img.hasAttribute('alt'),
  hasLabel: (input: HTMLInputElement) => {
    const label = input.labels?.length ?? 0;
    return label > 0 || input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
  },
  hasAriaRequired: (element: HTMLElement) => {
    const required = element.getAttribute('aria-required');
    return required === 'true' || required === 'false';
  },
  hasValidTabIndex: (element: HTMLElement) => {
    const tabIndex = element.getAttribute('tabindex');
    return tabIndex === null || !isNaN(parseInt(tabIndex || ''));
  },
} as const;
