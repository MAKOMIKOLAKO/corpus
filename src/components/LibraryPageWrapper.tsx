'use client';

import { ReactNode } from 'react';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';

interface LibraryPageWrapperProps {
  children: ReactNode;
}

export default function LibraryPageWrapper({ children }: LibraryPageWrapperProps) {
  // Use a unique key for the library page
  useScrollPosition('library');

  // Handle session refresh if needed
  useSessionRefresh();

  return <>{children}</>;
}
