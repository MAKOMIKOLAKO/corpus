// HIDDEN — feature disabled, do not import
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Link as LinkIcon, Clock, BookOpen, AlertCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { beginWorkspaceOpen, clearWorkspaceOpen } from '@/lib/workspaceOpenState'

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
    clearWorkspaceOpen()

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

    if (!beginWorkspaceOpen()) {
      toast.info('A workspace is already opening')
      return
    }

    setIsLoading(true)
    router.push(`/workspace/new?arxivUrl=${encodeURIComponent(arxivUrl.trim())}`)
  }

  return (
    <div className="w-full bg-background py-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 sm:px-6">
        <div className="space-y-3">
          <h2 className="font-serif text-[2rem] font-medium leading-[1.15] text-content-primary">
            Paper Workspace
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-content-secondary sm:text-base">
            Open arXiv papers in a dedicated reading workspace with structured AI takeaways, recent session history, and grounded paper Q&amp;A.
          </p>
        </div>

        <Card variant="ivory" className="rounded-2xl border border-border-cream shadow-none ring-shadow-warm">
          <CardHeader className="px-6 pt-6">
            <CardTitle>Open an arXiv paper</CardTitle>
            <CardDescription>
              Paste an arXiv URL to launch a protected loading flow before the workspace session is created.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="text"
                value={arxivUrl}
                onChange={(e) => setArxivUrl(e.target.value)}
                placeholder="https://arxiv.org/abs/2301.00000"
                disabled={isLoading}
                className="h-12 rounded-xl border-border bg-card px-4 text-content-primary placeholder:text-content-tertiary"
                onKeyDown={(e) => e.key === 'Enter' && handleOpenByArxiv()}
              />
              <Button
                onClick={handleOpenByArxiv}
                disabled={!arxivUrl.trim() || isLoading}
                variant="terracotta"
                size="lg"
                className="h-12 rounded-xl"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <LinkIcon />}
                {isLoading ? 'Opening workspace…' : 'Open workspace'}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-content-tertiary">
              Only arXiv papers are supported right now.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-serif text-[1.6rem] font-medium leading-[1.2] text-content-primary">Recent sessions</h3>
            <p className="text-sm leading-relaxed text-content-secondary">
              Pick up where you left off without creating a new workspace session.
            </p>
          </div>
          {sessionsLoading ? (
            <Card variant="ivory" className="rounded-2xl border border-border-cream py-12 shadow-none ring-shadow-warm">
              <CardContent className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </CardContent>
            </Card>
          ) : sessionsError ? (
            <Card variant="ivory" className="rounded-2xl border border-border-cream py-6 text-center shadow-none ring-shadow-warm">
              <CardContent className="space-y-3">
                <AlertCircle className="mx-auto h-10 w-10 text-error" />
                <p className="text-content-secondary">{sessionsError}</p>
              </CardContent>
            </Card>
          ) : sessions.length === 0 ? (
            <Card variant="ivory" className="rounded-2xl border border-border-cream py-8 text-center shadow-none ring-shadow-warm">
              <CardContent className="space-y-3">
                <BookOpen className="mx-auto h-10 w-10 text-content-tertiary" />
                <div className="space-y-1">
                  <p className="text-content-secondary">No workspace sessions yet</p>
                  <p className="text-sm leading-relaxed text-content-tertiary">
                    Open an arXiv paper from Discover or paste a URL above to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/workspace/${session.id}`)}
                  className="w-full rounded-2xl border border-border-cream bg-ivory p-5 text-left transition-all hover:ring-shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <h4 className="font-serif text-xl font-medium leading-[1.2] text-content-primary line-clamp-2">
                        {session.paperTitle}
                      </h4>
                      <p className="text-sm leading-relaxed text-content-secondary">
                        {session.paperAuthors.slice(0, 3).join(', ')}
                        {session.paperAuthors.length > 3 && ' et al.'}
                        {session.paperYear && ` · ${session.paperYear}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-content-tertiary">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warm-sand text-charcoal-warm ring-shadow-warm">
                      <ArrowRight className="h-4 w-4" />
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
