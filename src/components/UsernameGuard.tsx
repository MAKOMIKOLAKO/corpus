'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import UsernameSetupModal from '@/components/UsernameSetupModal';

interface UsernameGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function UsernameGuard({ children, fallback }: UsernameGuardProps) {
  const { data: session, status } = useSession();
  
  // Show loading while checking session
  if (status === 'loading') {
    return fallback || null;
  }
  
  // Don't render children if user is authenticated but has no username
  if (session && !session.user?.username) {
    return <UsernameSetupModal />;
  }
  
  // Otherwise, render children normally
  return <>{children}</>;
}
