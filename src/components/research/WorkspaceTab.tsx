'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Link as LinkIcon, Clock, BookOpen, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface WorkspaceSession {
  id: string
  arxivId: string | null
  paperTitle: string
  paperAuthors: string[]
  paperYear: number | null
  summaryCount: number
  messageCount: number
  lastActivityAt: string
}

interface WorkspaceTabProps {
  userId: string
}

export function WorkspaceTab({ userId }: WorkspaceTabProps) {
  const router = useRouter()
  const [arxivUrl, setArxivUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<WorkspaceSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSessions = async () => {
      setSessionsLoading(true)
      setSessionsError(null)
      try {
        const response = await fetch('/api/workspace/sessions?limit=10')
        if (!response.ok) {
          throw new Error('Failed to fetch sessions')
        }
        const data = await response.json()
        setSessions(data.sessions || [])
      } catch (error) {
        console.error('Failed to fetch workspace sessions:', error)
        setSessionsError('Failed to load recent sessions')
      } finally {
        setSessionsLoading(false)
      }
    }

    fetchSessions()
  }, [])

  const handleOpenByArxiv = async () => {
    if (!arxivUrl.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/workspace/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arxivUrl: arxivUrl.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create workspace session')
      }

      const session = await response.json()
      toast.success('Workspace session created')
      router.push(`/workspace/${session.id}`)
    } catch (error) {
      console.error('Failed to open arXiv paper:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to open paper')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full py-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-2xl font-serif font-medium text-content-primary mb-2" style={{ lineHeight: 1.20 }}>
          Paper Workspace
        </h2>
        <p className="text-content-secondary mb-8" style={{ lineHeight: 1.60 }}>
          Open arXiv papers to generate section summaries and ask questions via AI
        </p>

        {/* Open by arXiv URL */}
        <div className="mb-10 rounded-xl border border-border bg-card p-5 whisper-shadow">
          <label className="block text-sm font-medium text-content-secondary mb-3">
            Open arXiv paper by URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={arxivUrl}
              onChange={(e) => setArxivUrl(e.target.value)}
              placeholder="https://arxiv.org/abs/2301.00000"
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              onKeyDown={(e) => e.key === 'Enter' && handleOpenByArxiv()}
            />
            <button
              onClick={handleOpenByArxiv}
              disabled={!arxivUrl.trim() || isLoading}
              className="px-5 py-2.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium button-terracotta flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Open
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-content-tertiary">
            Only arXiv papers are supported in the workspace
          </p>
        </div>

        {/* Recent sessions */}
        <div>
          <h3 className="text-lg font-medium text-content-primary mb-4">Recent sessions</h3>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : sessionsError ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center whisper-shadow">
              <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
              <p className="text-content-secondary">{sessionsError}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center whisper-shadow">
              <BookOpen className="w-10 h-10 text-content-tertiary mx-auto mb-3" />
              <p className="text-content-secondary mb-1">No workspace sessions yet</p>
              <p className="text-sm text-content-tertiary">
                Open an arXiv paper from your discovery feed or paste a URL above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/workspace/${session.id}`)}
                  className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-border-strong transition-colors whisper-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-medium text-content-primary line-clamp-2 mb-1">
                        {session.paperTitle}
                      </h4>
                      <p className="text-xs text-content-secondary">
                        {session.paperAuthors.slice(0, 3).join(', ')}
                        {session.paperAuthors.length > 3 && ' et al.'}
                        {session.paperYear && ` · ${session.paperYear}`}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-content-tertiary">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(session.lastActivityAt).toLocaleDateString()}
                        </div>
                        {session.summaryCount > 0 && (
                          <span>{session.summaryCount} summary{session.summaryCount !== 1 ? 'ies' : ''}</span>
                        )}
                        {session.messageCount > 0 && (
                          <span>{session.messageCount} message{session.messageCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
