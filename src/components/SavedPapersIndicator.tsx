'use client'

import { Bookmark } from 'lucide-react'
import { useSavedEntries } from '@/hooks/useSavedEntries'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function SavedPapersIndicator() {
  const { count } = useSavedEntries()
  const { data: session } = useSession()

  // Only show for non-authenticated users
  if (session?.user || count === 0) return null

  return (
    <Link
      href="/signup"
      className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 z-40 hover:scale-105"
    >
      <Bookmark className="w-4 h-4" />
      <span className="font-medium">{count} saved</span>
    </Link>
  )
}
