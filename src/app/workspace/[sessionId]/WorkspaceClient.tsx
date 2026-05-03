'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, MessageSquare, Sparkles, ChevronDown, ChevronUp, Send, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'

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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/research?tab=workspace')}
              className="text-sm text-content-secondary hover:text-content-primary transition-colors"
            >
              ← Back to workspace
            </button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-serif font-medium text-content-primary line-clamp-1 max-w-2xl">
              {paperTitle}
            </h1>
          </div>
          {arxivUrl && (
            <a
              href={arxivUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-content-secondary hover:text-accent transition-colors flex items-center gap-1"
            >
              <ExternalLink size={14} />
              arXiv
            </a>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-[1600px] mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-full">
            {/* Left panel: Paper sections */}
            <div className="border-r border-border bg-card overflow-y-auto">
              <div className="p-4 sm:p-6">
                {/* Paper metadata */}
                <div className="mb-8 rounded-lg border border-border bg-surface-sunken/30 p-4">
                  <p className="text-sm text-content-secondary mb-2">
                    <span className="font-medium">{paperAuthors.slice(0, 3).join(', ')}</span>
                    {paperAuthors.length > 3 && ' et al.'}
                  </p>
                  {paperYear && <p className="text-sm text-content-tertiary">{paperYear}</p>}
                </div>

                {/* Sections */}
                {sections && sections.length > 0 ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-medium text-content-primary">Sections</h2>
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
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
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
                          <div key={section.index} className="rounded-lg border border-border bg-card overflow-hidden">
                            <button
                              onClick={() => {
                                setActiveSection(section.index)
                                toggleSection(section.index)
                              }}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-sunken/30 transition-colors"
                            >
                              <span className="text-sm font-medium text-content-primary line-clamp-1 flex-1 text-left">
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
                                    className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
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
                              <div className="border-t border-border p-4">
                                {summary ? (
                                  <div className="text-sm text-content-secondary leading-relaxed mb-3">
                                    {summary.content}
                                  </div>
                                ) : null}
                                <div className="text-sm text-content-tertiary leading-relaxed max-h-64 overflow-y-auto">
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
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <FileText className="w-8 h-8 text-content-tertiary mx-auto mb-3" />
                    <p className="text-sm text-content-secondary mb-1">Processing paper sections...</p>
                    <p className="text-xs text-content-tertiary">Sections will appear here shortly</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
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
                      className="text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                      Retry fetching full text
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Q&A */}
            <div className="bg-surface-sunken/20 flex flex-col h-full">
              <div className="border-b border-border bg-card px-4 py-3">
                <h2 className="text-sm font-medium text-content-primary flex items-center gap-2">
                  <MessageSquare size={16} />
                  Ask about this paper
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
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
                      className={`rounded-lg px-4 py-3 ${msg.role === 'user'
                        ? 'bg-accent/10 text-accent-foreground ml-auto max-w-[90%]'
                        : 'bg-card text-content-secondary mr-auto max-w-[90%]'
                        }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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

              <div className="border-t border-border bg-card p-4">
                <div className="flex gap-2">
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
                    className="resize-none min-h-[60px] max-h-[120px]"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={!question.trim() || isGenerating}
                    className="self-end px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
