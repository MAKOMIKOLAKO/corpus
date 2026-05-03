'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, MessageSquare, Sparkles, ChevronDown, ChevronUp, Send, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { clearWorkspaceOpen } from '@/lib/workspaceOpenState'

interface ExtractedSection {
  index: number
  heading: string
  text: string
  wordCount: number
}

interface SectionSummary {
  id: string
  sectionIndex: number
  sectionHeading: string
  summaryType: 'overview' | 'section'
  content: string
  inputTokens: number
  outputTokens: number
  generatedAt: string
}

interface WorkspaceMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedSectionIndices: number[]
  createdAt: string
}

interface WorkspaceClientProps {
  sessionId: string
  arxivId: string | null
  arxivUrl: string | null
  paperTitle: string
  paperAuthors: string[]
  paperYear: number | null
  paperAbstract: string | null
  sections: ExtractedSection[] | null
  hasFullText: boolean
  userId: string
}

export function WorkspaceClient({
  sessionId,
  arxivId,
  arxivUrl,
  paperTitle,
  paperAuthors,
  paperYear,
  paperAbstract,
  sections,
  hasFullText,
  userId,
}: WorkspaceClientProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<number | null>(null)
  const [summaries, setSummaries] = useState<SectionSummary[]>([])
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  useEffect(() => {
    clearWorkspaceOpen()

    const loadSummaries = async () => {
      try {
        const response = await fetch(`/api/workspace/session/${sessionId}/summaries`)
        if (response.ok) {
          const data = await response.json()
          setSummaries(data.summaries || [])
        }
      } catch (error) {
        console.error('Failed to load summaries:', error)
      }
    }

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/workspace/session/${sessionId}/messages?page=1&limit=50`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }

    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([loadSummaries(), loadMessages()])
      setIsLoading(false)
    }

    loadData()
  }, [sessionId])

  const handleGenerateOverview = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/workspace/session/${sessionId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryType: 'overview', regenerate: false }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate overview')
      }

      const summary = await response.json()
      setSummaries((prev) => [...prev, summary])
      toast.success('Overview generated')
    } catch (error) {
      console.error('Failed to generate overview:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate overview')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateSectionSummary = async (sectionIndex: number) => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/workspace/session/${sessionId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryType: 'section', sectionIndex, regenerate: false }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate section summary')
      }

      const summary = await response.json()
      setSummaries((prev) => [...prev, summary])
      toast.success('Section summary generated')
    } catch (error) {
      console.error('Failed to generate section summary:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate section summary')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAskQuestion = async () => {
    if (!question.trim()) return

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/workspace/session/${sessionId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get answer')
      }

      const data = await response.json()
      setMessages((prev) => [...prev, data.userMessage, data.assistantMessage])
      setQuestion('')
    } catch (error) {
      console.error('Failed to ask question:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to get answer')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const getSummaryForSection = (sectionIndex: number): SectionSummary | undefined => {
    return summaries.find((s) => s.sectionIndex === sectionIndex && s.summaryType === 'section')
  }

  const getOverview = (): SectionSummary | undefined => {
    return summaries.find((s) => s.summaryType === 'overview')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-border-cream bg-ivory p-8 text-center ring-shadow-warm sm:p-12">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-terracotta" />
            <h1 className="font-serif text-[1.9rem] font-medium leading-[1.15] text-content-primary sm:text-[2.2rem]">
              Loading your workspace
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-content-secondary sm:text-base">
              Pulling together the paper, AI sections, and conversation history.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-cream bg-background px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push('/research?tab=workspace')}
              className="inline-flex items-center rounded-lg px-2 py-1 text-sm text-content-secondary transition-colors hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ← Back to workspace
            </button>
            <div className="h-4 w-px bg-border-cream" />
            <h1 className="max-w-2xl line-clamp-1 font-serif text-[1.55rem] font-medium leading-[1.15] text-content-primary sm:text-[1.8rem]">
              {paperTitle}
            </h1>
          </div>
          {arxivUrl && (
            <a
              href={arxivUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-content-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink size={14} />
              arXiv
            </a>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
            {/* Left panel: Paper sections */}
            <section className="overflow-hidden rounded-[28px] border border-border-cream bg-ivory ring-shadow-warm">
              <div className="p-5 sm:p-7">
                {/* Paper metadata */}
                <div className="mb-8 rounded-2xl border border-border-cream bg-background/70 p-5 ring-shadow-warm">
                  <p className="mb-2 text-sm leading-relaxed text-content-secondary">
                    <span className="font-medium">{paperAuthors.slice(0, 3).join(', ')}</span>
                    {paperAuthors.length > 3 && ' et al.'}
                  </p>
                  {paperYear && <p className="text-sm text-content-tertiary">{paperYear}</p>}
                  {paperAbstract ? (
                    <p className="mt-4 text-sm leading-relaxed text-content-secondary">
                      {paperAbstract}
                    </p>
                  ) : null}
                </div>

                {/* Sections */}
                {sections && sections.length > 0 ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="font-serif text-[1.45rem] font-medium leading-[1.2] text-content-primary">Sections</h2>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/workspace/session/${sessionId}/hydrate`, { method: 'POST' })
                            if (response.ok) {
                              window.location.reload()
                            }
                          } catch (error) {
                            console.error('Failed to regenerate sections:', error)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-warm-sand px-3 py-2 text-xs font-medium text-charcoal-warm transition-all hover:ring-shadow-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <RefreshCw size={12} />
                        Regenerate
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {sections.map((section) => {
                        const summary = getSummaryForSection(section.index)
                        const isExpanded = expandedSections.has(section.index)

                        return (
                          <div key={section.index} className="overflow-hidden rounded-2xl border border-border-cream bg-background/80 ring-shadow-warm">
                            <button
                              onClick={() => {
                                setActiveSection(section.index)
                                toggleSection(section.index)
                              }}
                              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-warm-sand/35"
                            >
                              <span className="line-clamp-1 flex-1 font-serif text-[1.05rem] font-medium leading-[1.2] text-content-primary">
                                {section.heading}
                              </span>
                              <div className="flex items-center gap-2">
                                {!summary && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleGenerateSectionSummary(section.index)
                                    }}
                                    disabled={isGenerating}
                                    className="inline-flex items-center gap-1 rounded-lg bg-terracotta/10 px-2.5 py-1.5 text-xs font-medium text-terracotta transition-colors hover:bg-terracotta/15 disabled:opacity-50"
                                  >
                                    <Sparkles size={10} />
                                  </button>
                                )}
                                {isExpanded ? (
                                  <ChevronUp size={16} className="text-content-tertiary" />
                                ) : (
                                  <ChevronDown size={16} className="text-content-tertiary" />
                                )}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-border-cream p-4 sm:p-5">
                                {summary ? (
                                  <div className="mb-3 rounded-xl bg-terracotta/8 p-3 text-sm leading-relaxed text-content-secondary">
                                    {summary.content}
                                  </div>
                                ) : null}
                                <div className="max-h-64 overflow-y-auto text-sm leading-relaxed text-content-tertiary">
                                  {section.text}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : hasFullText ? (
                  <div className="rounded-2xl border border-dashed border-border-cream p-8 text-center">
                    <FileText className="w-8 h-8 text-content-tertiary mx-auto mb-3" />
                    <p className="text-sm text-content-secondary mb-1">Processing paper sections...</p>
                    <p className="text-xs text-content-tertiary">Sections will appear here shortly</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border-cream p-8 text-center">
                    <AlertCircle className="w-8 h-8 text-content-tertiary mx-auto mb-3" />
                    <p className="text-sm text-content-secondary mb-1">Full text not available</p>
                    <p className="text-xs text-content-tertiary mb-3">
                      Only abstract is available for this paper
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/workspace/session/${sessionId}/hydrate`, { method: 'POST' })
                          if (response.ok) {
                            window.location.reload()
                          }
                        } catch (error) {
                          console.error('Failed to retry hydration:', error)
                        }
                      }}
                      className="inline-flex items-center rounded-lg bg-warm-sand px-3 py-2 text-xs font-medium text-charcoal-warm transition-all hover:ring-shadow-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Retry fetching full text
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Right panel: Q&A */}
            <section className="flex min-h-[640px] flex-col overflow-hidden rounded-[28px] border border-border-cream bg-ivory ring-shadow-warm">
              <div className="border-b border-border-cream bg-background/70 px-5 py-4 sm:px-6">
                <h2 className="flex items-center gap-2 font-serif text-[1.35rem] font-medium leading-[1.2] text-content-primary">
                  <MessageSquare size={16} />
                  Ask about this paper
                </h2>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                {messages.length === 0 ? (
                  <div className="py-14 text-center">
                    <MessageSquare className="w-10 h-10 text-content-tertiary mx-auto mb-3" />
                    <p className="text-sm text-content-secondary mb-1">No questions yet</p>
                    <p className="text-xs text-content-tertiary">
                      Ask a question about this paper to get started
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                        ? 'ml-auto max-w-[90%] bg-terracotta text-white ring-shadow-warm'
                        : 'mr-auto max-w-[90%] bg-background text-content-secondary ring-shadow-warm'
                        }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-content-tertiary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>

              <div className="border-t border-border-cream bg-background/70 p-5 sm:p-6">
                <div className="flex gap-3">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAskQuestion()
                      }
                    }}
                    placeholder="Ask a question about this paper..."
                    disabled={isGenerating}
                    className="min-h-[72px] max-h-[140px] resize-none rounded-2xl border-border bg-white px-4 py-3 text-content-primary placeholder:text-content-tertiary"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={!question.trim() || isGenerating}
                    className="self-end rounded-xl bg-terracotta px-4 py-3 text-white shadow-[var(--terracotta)_0px_0px_0px_0px,var(--terracotta)_0px_0px_0px_1px] transition-all hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
