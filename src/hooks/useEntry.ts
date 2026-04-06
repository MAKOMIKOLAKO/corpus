'use client'

import { useState, useEffect } from 'react'
import { FlatEntry } from '@/types/entry'

export function useEntry(userEntryId: string) {
  const [entry, setEntry] = useState<FlatEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userEntryId) return
    
    setLoading(true)
    fetch(`/api/entries/${userEntryId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setEntry(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userEntryId])

  const updateReadingStatus = async (status: string) => {
    if (!entry) return
    const prev = entry.readingStatus
    // Optimistic update
    setEntry(e => e ? { ...e, readingStatus: status as any } : e)
    
    try {
      const response = await fetch(`/api/entries/${userEntryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingStatus: status })
      })
      if (!response.ok) throw new Error('Update failed')
    } catch {
      // Revert on error
      setEntry(e => e ? { ...e, readingStatus: prev as any } : e)
    }
  }

  const deleteEntry = async () => {
    await fetch(`/api/entries/${userEntryId}`, { method: 'DELETE' })
  }

  return { entry, loading, error, updateReadingStatus, deleteEntry }
}
