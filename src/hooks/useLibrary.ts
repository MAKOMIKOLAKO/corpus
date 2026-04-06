'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FlatEntry } from '@/types/entry'

interface LibraryState {
  entries: FlatEntry[]
  total: number
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
}

interface LibraryFilters {
  q?: string
  readingStatus?: string
  year?: number
  collectionId?: string
  sortBy?: string
  sortOrder?: string
}

export function useLibrary(filters: LibraryFilters = {}) {
  const [state, setState] = useState<LibraryState>({
    entries: [],
    total: 0,
    loading: true,
    error: null,
    hasMore: false,
    page: 1
  })

  const requestIdRef = useRef(0)

  const queryBase = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.readingStatus) params.set('readingStatus', filters.readingStatus)
    if (filters.year) params.set('year', String(filters.year))
    if (filters.collectionId) params.set('collectionId', filters.collectionId)
    if (filters.sortBy) params.set('sortBy', filters.sortBy)
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
    return params
  }, [
    filters.q,
    filters.readingStatus,
    filters.year,
    filters.collectionId,
    filters.sortBy,
    filters.sortOrder,
  ])

  const fetchEntries = useCallback(async (page = 1, append = false) => {
    const requestId = ++requestIdRef.current
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const params = new URLSearchParams(queryBase)
      params.set('page', String(page))
      params.set('limit', '20')

      const response = await fetch(`/api/entries?${params}`)
      const data = await response.json()

      if (requestId !== requestIdRef.current) {
        return
      }

      setState(s => ({
        entries: append ? [...s.entries, ...data.entries] : data.entries,
        total: data.total,
        loading: false,
        error: null,
        hasMore: data.hasMore,
        page
      }))
    } catch (e: any) {
      if (requestId !== requestIdRef.current) {
        return
      }
      setState(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [queryBase])

  useEffect(() => {
    fetchEntries(1, false)
  }, [fetchEntries])

  const loadMore = () => fetchEntries(state.page + 1, true)

  const removeEntry = (userEntryId: string) => {
    setState(s => ({
      ...s,
      entries: s.entries.filter(e => e.id !== userEntryId),
      total: s.total - 1
    }))
  }

  const updateEntry = (userEntryId: string, updates: Partial<FlatEntry>) => {
    setState(s => ({
      ...s,
      entries: s.entries.map(e =>
        e.id === userEntryId ? { ...e, ...updates } : e
      )
    }))
  }

  const highlightDuplicate = (globalEntryId: string) => {
    setState(s => ({
      ...s,
      entries: s.entries.map(e =>
        e.globalEntryId === globalEntryId
          ? { ...e, _highlighted: true }
          : e
      )
    }))
    // Remove highlight after 2 seconds
    setTimeout(() => {
      setState(s => ({
        ...s,
        entries: s.entries.map(e => ({ ...e, _highlighted: false }))
      }))
    }, 2000)
  }

  return {
    ...state,
    refresh: () => fetchEntries(1, false),
    loadMore,
    removeEntry,
    updateEntry,
    highlightDuplicate
  }
}
