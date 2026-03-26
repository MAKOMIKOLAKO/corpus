'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface SavedEntry {
  id: string
  title: string
  authors: string[]
  year?: number
  doi?: string
  url?: string
}

export function useDatabaseSavedEntries() {
  const { data: session, status } = useSession()
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load saved entries from database when user is logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchSavedEntries()
    } else {
      setSavedEntries([])
    }
  }, [session, status])

  const fetchSavedEntries = async () => {
    try {
      const response = await fetch('/api/entries')
      if (response.ok) {
        const entries = await response.json()
        setSavedEntries(Array.isArray(entries) ? entries : [])
      }
    } catch (error) {
      console.error('Error fetching saved entries:', error)
      setSavedEntries([])
    }
  }

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

  // Save or unsave an entry
  const toggleSave = async (entry: {
    title: string
    authors: string[]
    year?: number
    doi?: string
    url?: string
  }) => {
    if (status !== 'authenticated') {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/entries/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to save entry')
      }

      const result = await response.json()

      // Update local state
      if (result.action === 'created') {
        setSavedEntries(prev => [...prev, result.entry])
      } else if (result.action === 'deleted') {
        setSavedEntries(prev => prev.filter(e => e.id !== result.entry.id))
      }

      return result.action === 'created'
    } catch (error) {
      console.error('Error toggling save:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    savedEntries,
    isSaved,
    toggleSave,
    isLoading,
    refetch: fetchSavedEntries,
  }
}
