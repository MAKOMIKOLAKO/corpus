'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import SavedPapersIndicator from '@/components/SavedPapersIndicator'

interface SEOLayoutWrapperProps {
  children: ReactNode
}

export default function SEOLayoutWrapper({ children }: SEOLayoutWrapperProps) {
  const { data: session } = useSession()

  // Only show saved papers indicator for non-authenticated users
  if (session?.user) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <SavedPapersIndicator />
    </>
  )
}
