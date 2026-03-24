'use client';

import { ReactNode } from 'react';
import { useScrollPosition } from '@/hooks/useScrollPosition';

interface LibraryPageWrapperProps {
  children: ReactNode;
}

export default function LibraryPageWrapper({ children }: LibraryPageWrapperProps) {
  // Use a unique key for the library page
  useScrollPosition('library');
  
  return <>{children}</>;
}
