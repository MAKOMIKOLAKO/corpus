'use client';

import { ReactNode } from 'react';
import UsernameSetupModal from '@/components/UsernameSetupModal';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <>
      <UsernameSetupModal />
      {children}
    </>
  );
}
