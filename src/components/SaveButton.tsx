'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useSavedEntries } from '@/hooks/useSavedEntries'
import { useDatabaseSavedEntries } from '@/hooks/useDatabaseSavedEntries'
import { useSession } from 'next-auth/react'

interface SaveButtonProps {
  title: string
  authors: string[]
  year?: number
  doi?: string
  url?: string
  topics: string[]
  className?: string
  onSignupTrigger?: () => void
}

export default function SaveButton({
  title,
  authors,
  year,
  doi,
  url,
  topics,
  className = '',
  onSignupTrigger,
}: SaveButtonProps) {
  const { data: session } = useSession()
  const { isSaved: isSavedLocal, saveEntry, count } = useSavedEntries()
  const { isSaved: isSavedDB, toggleSave, isLoading: isLoadingDB } = useDatabaseSavedEntries()
  const [isAnimating, setIsAnimating] = useState(false)

  const isLoggedIn = !!session?.user
  const saved = isLoggedIn ? isSavedDB({ title, doi }) : isSavedLocal({ title, doi })

  const handleClick = async () => {
    // Validate required fields
    if (!title || (Array.isArray(authors) && authors.length === 0)) {
      console.error('Invalid entry data: missing title or authors')
      return
    }

    if (!isLoggedIn) {
      // Check if this is the second save (trigger signup)
      if (count >= 1) {
        onSignupTrigger?.()
        return
      }
    }

    setIsAnimating(true)

    try {
      if (isLoggedIn) {
        // Save to database
        await toggleSave({
          title,
          authors,
          year,
          doi,
          url,
          topics,
        })
      } else {
        // Save to localStorage
        saveEntry({
          title,
          authors,
          year,
          doi,
          url,
          topics,
        })

        // If this was the second save, trigger signup
        if (count >= 1) {
          setTimeout(() => {
            onSignupTrigger?.()
          }, 500)
        }
      }
    } catch (error) {
      console.error('Error saving entry:', error)
    }

    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoadingDB || isAnimating}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${saved
        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${(isLoadingDB || isAnimating) ? 'scale-95 opacity-75' : 'scale-100'} ${className}`}
    >
      {isLoadingDB ? (
        <>
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Saving...</span>
        </>
      ) : saved ? (
        <>
          <BookmarkCheck className="w-5 h-5" />
          <span>Saved</span>
        </>
      ) : (
        <>
          <Bookmark className="w-5 h-5" />
          <span>Save</span>
        </>
      )}
    </button>
  )
}
