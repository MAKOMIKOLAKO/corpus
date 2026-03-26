'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import SavedPapersIndicator from '@/components/SavedPapersIndicator'

interface SEOLayoutWrapperProps {
  children: ReactNode
}

export default function SEOLayoutWrapper({ children }: SEOLayoutWrapperProps) {
  const { data: session } = useSession()

  // Always render the indicator as it handles its own visibility logic
  return (
    <>
      {children}
      <SavedPapersIndicator />
    </>
  )
}
