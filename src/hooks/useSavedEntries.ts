'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface SavedEntry {
  title: string
  authors: string[]
  year?: number
  doi?: string
  url?: string
  topics: string[]
}

const SAVED_ENTRIES_KEY = 'corpus_saved_entries'

export function useSavedEntries() {
  const { data: session, status } = useSession()
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load saved entries from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(SAVED_ENTRIES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSavedEntries(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error('Error loading saved entries:', error)
      setSavedEntries([])
    }
  }, [])

  // Check if an entry is saved
  const isSaved = (entry: { title?: string; doi?: string }) => {
    if (!entry?.title && !entry?.doi) return false

    return savedEntries.some(saved => {
      if (!saved) return false
      if (entry.doi && saved.doi) {
        return saved.doi === entry.doi
      }
      if (entry.title && saved.title) {
        return saved.title.toLowerCase() === entry.title.toLowerCase()
      }
      return false
    })
  }

  // Save an entry to localStorage
  const saveEntry = (entry: SavedEntry) => {
    if (typeof window === 'undefined') return false

    // Check for duplicates
    if (isSaved(entry)) {
      // Remove if already saved (toggle behavior)
      const updated = savedEntries.filter(saved => {
        if (entry.doi && saved.doi) {
          return saved.doi !== entry.doi
        }
        if (entry.title && saved.title) {
          return saved.title.toLowerCase() !== entry.title.toLowerCase()
        }
        return true
      })
      setSavedEntries(updated)
      localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(updated))
      return false // Indicates removed
    } else {
      // Add new entry
      const updated = [...savedEntries, entry]
      setSavedEntries(updated)
      localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(updated))
      return true // Indicates added
    }
  }

  // Sync saved entries to backend after auth
  const syncToBackend = async () => {
    if (!session?.user || savedEntries.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/entries/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: savedEntries }),
      })

      if (response.ok) {
        // Clear localStorage after successful sync
        localStorage.removeItem(SAVED_ENTRIES_KEY)
        setSavedEntries([])
        return await response.json()
      } else {
        throw new Error('Failed to sync entries')
      }
    } catch (error) {
      console.error('Error syncing entries:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Clear all saved entries
  const clearSavedEntries = () => {
    if (typeof window === 'undefined') return

    setSavedEntries([])
    localStorage.removeItem(SAVED_ENTRIES_KEY)
  }

  return {
    savedEntries,
    isSaved,
    saveEntry,
    syncToBackend,
    clearSavedEntries,
    isLoading,
    count: savedEntries.length,
  }
}
