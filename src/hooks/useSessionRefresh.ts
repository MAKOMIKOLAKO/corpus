'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function useSessionRefresh() {
  const { data: session, update } = useSession();

  useEffect(() => {
    // Check if we need to refresh the session
    const refreshFlag = document.cookie
      .split('; ')
      .find(row => row.startsWith('refresh-session='));
    
    if (refreshFlag && refreshFlag.split('=')[1] === 'true') {
      // Clear the flag and refresh the session
      document.cookie = 'refresh-session=; Max-Age=0; path=/';
      update(true);
    }
  }, [session, update]);
}
