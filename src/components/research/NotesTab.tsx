'use client'

import { useState, useEffect } from 'react'
import { Save, Download, CheckCircle2 } from 'lucide-react'

interface NotesTabProps {
  sessionId: string
  initialNotes?: string
}

export function NotesTab({ sessionId, initialNotes = '' }: NotesTabProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setSaveStatus('unsaved')

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer for auto-save
    const timer = setTimeout(() => {
      saveNotes(value)
    }, 2000)

    setDebounceTimer(timer)
  }

  const saveNotes = async (value: string) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/research/reading/${sessionId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      })

      if (res.ok) {
        setSaveStatus('saved')
      } else {
        setSaveStatus('unsaved')
      }
    } catch (error) {
      console.error('Failed to save notes:', error)
      setSaveStatus('unsaved')
    }
  }

  const handleExport = () => {
    const blob = new Blob([notes], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notes-${sessionId}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-medium text-content-primary">Notes</h3>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-content-tertiary">
              <CheckCircle2 className="w-3 h-3" />
              Saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-xs text-content-tertiary">Saving...</span>
          )}
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-surface-sunken text-content-secondary hover:text-content-primary transition-colors"
            title="Export notes"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4">
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add your notes about this paper..."
          className="w-full h-full resize-none rounded-xl border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent p-4 font-mono text-sm leading-relaxed"
        />
      </div>
    </div>
  )
}
