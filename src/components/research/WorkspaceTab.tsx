'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  Upload,
  Type,
  BookOpen,
  Loader2,
  FileText,
  MessageSquare,
  ScrollText,
  Library,
  AlertCircle,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { normalizePaperIdentifier } from '@/lib/research/paperIdentifier'
import { ReadingAssistant } from '@/components/research/ReadingAssistant'
import { NotesTab } from '@/components/research/NotesTab'
import { CiteTab } from '@/components/research/CiteTab'

interface WorkspaceTabProps {
  userId: string
  plan: string
}

interface SessionSection {
  title: string
  content: string
}

interface SessionMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SessionData {
  id: string
  notes: string | null
  sections: SessionSection[]
  messages: SessionMessage[]
  candidatePaper: {
    title: string
    authors: string[]
    publishedDate: string | null
    source: string | null
    doi: string | null
    url: string | null
  } | null
}

function parseSections(rawSections: unknown): SessionSection[] {
  if (!Array.isArray(rawSections)) return []

  return rawSections
    .filter((section): section is { title?: unknown; content?: unknown } => typeof section === 'object' && section !== null)
    .map((section, index) => ({
      title: typeof section.title === 'string' && section.title.trim().length > 0
        ? section.title
        : `Section ${index + 1}`,
      content: typeof section.content === 'string' ? section.content : '',
    }))
    .filter((section) => section.content.trim().length > 0)
}

export function WorkspaceTab({ userId, plan }: WorkspaceTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('sessionId')

  const [inputMethod, setInputMethod] = useState<'arxiv' | 'pdf' | 'text' | 'library'>('arxiv')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<'fetching' | 'extracting' | 'ready'>('fetching')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [activeTool, setActiveTool] = useState<'assistant' | 'notes' | 'cite'>('assistant')

  useEffect(() => {
    if (!sessionId) {
      setSessionData(null)
      setSessionError(null)
      setActiveSection(0)
      return
    }

    const loadSession = async () => {
      setSessionLoading(true)
      setSessionError(null)

      try {
        const response = await fetch(`/api/research/reading/${sessionId}`)
        if (!response.ok) {
          let errorMessage = 'Failed to load reading session'
          try {
            const errorData = await response.json()
            if (typeof errorData?.error === 'string') {
              errorMessage = errorData.error
            }
          } catch {
            // Ignore parse errors and keep fallback message
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()
        const normalizedSections = parseSections(data.sections)
        const rawMessages: unknown[] = Array.isArray(data.messages) ? data.messages : []
        const normalizedMessages = rawMessages
          .filter(
            (message): message is { role?: unknown; content?: unknown } =>
              typeof message === 'object' && message !== null,
          )
          .filter(
            (message): message is SessionMessage =>
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string',
          )

        setSessionData({
          id: data.id,
          notes: typeof data.notes === 'string' ? data.notes : null,
          sections: normalizedSections,
          messages: normalizedMessages,
          candidatePaper: data.candidatePaper
            ? {
              title: data.candidatePaper.title,
              authors: Array.isArray(data.candidatePaper.authors) ? data.candidatePaper.authors : [],
              publishedDate: data.candidatePaper.publishedDate,
              source: data.candidatePaper.source,
              doi: data.candidatePaper.doi,
              url: data.candidatePaper.url,
            }
            : null,
        })
        setActiveSection(0)
      } catch (error) {
        console.error('Failed to fetch reading session:', error)
        setSessionError(error instanceof Error ? error.message : 'Failed to load reading session')
      } finally {
        setSessionLoading(false)
      }
    }

    loadSession()
  }, [sessionId])

  const activeSectionData = sessionData?.sections[activeSection]

  const paperForCite = useMemo(() => {
    const publishedYear = sessionData?.candidatePaper?.publishedDate
      ? new Date(sessionData.candidatePaper.publishedDate).getFullYear()
      : null

    return {
      title: sessionData?.candidatePaper?.title || `Paper session ${sessionData?.id ?? ''}`,
      authors: sessionData?.candidatePaper?.authors ?? [],
      year: Number.isFinite(publishedYear) ? publishedYear : null,
      source: sessionData?.candidatePaper?.source ?? null,
      doi: sessionData?.candidatePaper?.doi ?? null,
      url: sessionData?.candidatePaper?.url ?? null,
    }
  }, [sessionData])

  const handleLoadPaper = async () => {
    if (!inputValue.trim()) return

    setIsLoading(true)
    setLoadingStage('fetching')

    try {
      const paperId = inputMethod === 'arxiv'
        ? normalizePaperIdentifier(inputValue).normalized
        : inputValue.trim()

      // Call the existing /api/research/read endpoint (GET initializes a session)
      const res = await fetch(`/api/research/read?paperId=${encodeURIComponent(paperId)}`)

      if (res.status === 403) {
        router.push('/pricing?reason=reading_assistant_pro_only')
        return
      }

      if (!res.ok) {
        let errorMessage = 'Failed to load paper'
        try {
          const errorData = await res.json()
          if (errorData?.error) errorMessage = errorData.error
        } catch {
          // Ignore JSON parse errors and keep default message
        }
        throw new Error(errorMessage)
      }

      const data = await res.json()
      setLoadingStage('extracting')
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Brief delay for UX
      setLoadingStage('ready')

      // Navigate to the workspace with the session ID
      router.push(`/research?tab=workspace&sessionId=${data.id}`)
    } catch (error) {
      console.error('Failed to load paper:', error)
      const message = error instanceof Error ? error.message : 'Failed to load paper. Please try again.'
      alert(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
            <p className="text-content-secondary">
              {loadingStage === 'fetching' && 'Fetching paper...'}
              {loadingStage === 'extracting' && 'Extracting sections...'}
              {loadingStage === 'ready' && 'Ready.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          {!sessionId ? (
            <div>
              <h2 className="text-2xl font-serif font-medium text-content-primary mb-2" style={{ lineHeight: 1.20 }}>
                Research Workspace
              </h2>
              <p className="text-content-secondary mb-8" style={{ lineHeight: 1.60 }}>
                Load a paper to start analyzing and extracting insights
              </p>

              {/* Input Method Selector */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <button
                  onClick={() => setInputMethod('arxiv')}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${inputMethod === 'arxiv'
                    ? 'button-warm-sand border-border-strong text-content-primary'
                    : 'border-border hover:border-border-strong ring-shadow-warm'
                    }`}
                >
                  <Link className="w-5 h-5" />
                  <span className="text-sm font-medium">arXiv / DOI</span>
                </button>
                <button
                  onClick={() => setInputMethod('pdf')}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${inputMethod === 'pdf'
                    ? 'button-warm-sand border-border-strong text-content-primary'
                    : 'border-border hover:border-border-strong ring-shadow-warm'
                    }`}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload PDF</span>
                </button>
                <button
                  onClick={() => setInputMethod('text')}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${inputMethod === 'text'
                    ? 'button-warm-sand border-border-strong text-content-primary'
                    : 'border-border hover:border-border-strong ring-shadow-warm'
                    }`}
                >
                  <Type className="w-5 h-5" />
                  <span className="text-sm font-medium">Paste Text</span>
                </button>
                <button
                  onClick={() => setInputMethod('library')}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${inputMethod === 'library'
                    ? 'button-warm-sand border-border-strong text-content-primary'
                    : 'border-border hover:border-border-strong ring-shadow-warm'
                    }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">Library</span>
                </button>
              </div>

              {/* Input Area */}
              <div className="max-w-2xl">
                {inputMethod === 'arxiv' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-content-secondary">
                      Paste arXiv URL or DOI
                    </label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="https://arxiv.org/abs/2301.00000 or 10.1000/xyz123"
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <button
                      onClick={handleLoadPaper}
                      disabled={!inputValue.trim()}
                      className="px-6 py-3 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium button-terracotta"
                    >
                      Load Paper
                    </button>
                  </div>
                )}

                {inputMethod === 'pdf' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-content-secondary">
                      Upload PDF file
                    </label>
                    <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent transition-colors cursor-pointer">
                      <Upload className="w-10 h-10 text-content-tertiary mx-auto mb-3" />
                      <p className="text-content-secondary mb-1">
                        Drag and drop PDF here
                      </p>
                      <p className="text-sm text-content-tertiary">
                        or click to browse
                      </p>
                      <input type="file" accept=".pdf" className="hidden" />
                    </div>
                  </div>
                )}

                {inputMethod === 'text' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-content-secondary">
                      Paste paper text or abstract
                    </label>
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Paste the full paper text or abstract here..."
                      rows={12}
                      className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <button
                      onClick={handleLoadPaper}
                      disabled={!inputValue.trim()}
                      className="px-6 py-3 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium button-terracotta"
                    >
                      Load Paper
                    </button>
                  </div>
                )}

                {inputMethod === 'library' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-content-secondary">
                      Search your library
                    </label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Search saved papers..."
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="text-sm text-content-tertiary">
                      Library search coming soon
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-medium text-content-primary" style={{ lineHeight: 1.20 }}>
                  Paper Analysis
                </h2>
                <button
                  onClick={() => router.push('/research?tab=workspace')}
                  className="text-sm text-content-secondary hover:text-content-primary"
                >
                  Load different paper
                </button>
              </div>

              {sessionLoading ? (
                <div className="border border-border rounded-xl p-10 text-center whisper-shadow">
                  <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-3" />
                  <p className="text-content-secondary">Loading workspace session...</p>
                </div>
              ) : sessionError ? (
                <div className="border border-border rounded-xl p-8 text-center whisper-shadow">
                  <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
                  <p className="text-content-primary font-medium mb-1">Could not load this session</p>
                  <p className="text-sm text-content-secondary mb-4">{sessionError}</p>
                  <button
                    onClick={() => router.push('/research?tab=workspace')}
                    className="px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors button-terracotta"
                  >
                    Start another session
                  </button>
                </div>
              ) : sessionData ? (
                <>
                  <div className="rounded-xl border border-border bg-card p-4 sm:p-5 whisper-shadow">
                    <h3 className="text-xl font-serif font-medium text-content-primary mb-2" style={{ lineHeight: 1.25 }}>
                      {sessionData.candidatePaper?.title || 'Untitled paper'}
                    </h3>
                    <p className="text-sm text-content-secondary" style={{ lineHeight: 1.6 }}>
                      {sessionData.candidatePaper?.authors?.length
                        ? sessionData.candidatePaper.authors.join(', ')
                        : 'Author information unavailable'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-content-tertiary">
                      {sessionData.candidatePaper?.source && (
                        <span className="px-2 py-1 rounded-md bg-surface-sunken border border-border">
                          {sessionData.candidatePaper.source}
                        </span>
                      )}
                      {sessionData.sections.length > 0 && (
                        <span className="px-2 py-1 rounded-md bg-surface-sunken border border-border">
                          {sessionData.sections.length} sections
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-md bg-surface-sunken border border-border">
                        Session: {sessionData.id}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-5">
                    <div className="rounded-xl border border-border bg-card whisper-shadow overflow-hidden">
                      <div className="border-b border-border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-content-secondary">
                          <FileText className="w-4 h-4" />
                          Paper Viewer
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] min-h-[620px]">
                        <aside className="border-r border-border bg-surface-sunken/50 p-3 overflow-y-auto max-h-[620px]">
                          <p className="text-xs uppercase tracking-wide text-content-tertiary mb-2">
                            Sections
                          </p>
                          <div className="space-y-1.5">
                            {sessionData.sections.map((section, index) => (
                              <button
                                key={`${section.title}-${index}`}
                                onClick={() => setActiveSection(index)}
                                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors border ${activeSection === index
                                  ? 'button-warm-sand border-border-strong text-content-primary'
                                  : 'border-transparent text-content-secondary hover:bg-card hover:border-border'
                                  }`}
                              >
                                <span className="line-clamp-2">{section.title}</span>
                              </button>
                            ))}
                          </div>
                        </aside>

                        <article className="p-5 sm:p-6 overflow-y-auto max-h-[620px]">
                          {activeSectionData ? (
                            <>
                              <h4
                                className="text-lg font-serif font-medium text-content-primary mb-4"
                                style={{ lineHeight: 1.25 }}
                              >
                                {activeSectionData.title}
                              </h4>
                              <div className="space-y-3 text-sm text-content-secondary" style={{ lineHeight: 1.7 }}>
                                {activeSectionData.content
                                  .split(/\n{2,}/)
                                  .filter((paragraph) => paragraph.trim().length > 0)
                                  .map((paragraph, index) => (
                                    <p key={index}>{paragraph.trim()}</p>
                                  ))}
                              </div>
                            </>
                          ) : (
                            <div className="h-full flex items-center justify-center text-center px-6">
                              <div>
                                <ScrollText className="w-8 h-8 text-content-tertiary mx-auto mb-2" />
                                <p className="text-content-secondary">No parsed sections were found for this session.</p>
                              </div>
                            </div>
                          )}
                        </article>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card whisper-shadow overflow-hidden min-h-[620px] flex flex-col">
                      <div className="border-b border-border p-2 bg-surface-sunken/50">
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => setActiveTool('assistant')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${activeTool === 'assistant'
                              ? 'bg-card text-content-primary border border-border'
                              : 'text-content-secondary hover:text-content-primary'
                              }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Assistant
                          </button>
                          <button
                            onClick={() => setActiveTool('notes')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${activeTool === 'notes'
                              ? 'bg-card text-content-primary border border-border'
                              : 'text-content-secondary hover:text-content-primary'
                              }`}
                          >
                            <ScrollText className="w-3.5 h-3.5" />
                            Notes
                          </button>
                          <button
                            onClick={() => setActiveTool('cite')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${activeTool === 'cite'
                              ? 'bg-card text-content-primary border border-border'
                              : 'text-content-secondary hover:text-content-primary'
                              }`}
                          >
                            <Library className="w-3.5 h-3.5" />
                            Cite
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0">
                        {activeTool === 'assistant' && (
                          <ReadingAssistant
                            sessionId={sessionData.id}
                            initialMessages={sessionData.messages}
                            paperTitle={sessionData.candidatePaper?.title}
                          />
                        )}

                        {activeTool === 'notes' && (
                          <NotesTab
                            sessionId={sessionData.id}
                            initialNotes={sessionData.notes ?? ''}
                          />
                        )}

                        {activeTool === 'cite' && (
                          <CiteTab paper={paperForCite} />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
