'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ContentRenderer } from '@/components/ui/content-renderer'
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
  const [summaries, setSummaries] = useState<SectionSummary[]>([])
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  const submitQuestion = async (nextQuestion: string) => {
    if (!nextQuestion.trim()) return

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/workspace/session/${sessionId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: nextQuestion.trim() }),
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

  const handleAskQuestion = async () => {
    await submitQuestion(question)
  }

  const getOverview = (): SectionSummary | undefined => {
    return summaries.find((s) => s.summaryType === 'overview')
  }

  const normalizedSections = (() => {
    const preferred = ['Aim', 'Methods', 'Conclusion', 'Limitations', 'Future Research Paths']
    if (!sections || sections.length === 0) {
      return preferred.map((heading, index) => ({ index, heading, text: '' }))
    }

    return preferred.map((heading, index) => {
      const existing = sections.find((section) => section.heading.trim().toLowerCase() === heading.toLowerCase())
      return existing
        ? { index: existing.index, heading: existing.heading, text: existing.text }
        : { index, heading, text: '' }
    })
  })()

  const domainTags = (() => {
    const source = `${paperTitle} ${paperAbstract ?? ''}`.toLowerCase()
    const catalog = [
      { label: 'machine learning', match: /(machine learning|neural|transformer|deep learning|llm|language model|reinforcement learning)/, variant: 'default' as const },
      { label: 'health risk', match: /(health|clinical|medical|disease|patient|epidemiology|risk)/, variant: 'destructive' as const },
      { label: 'topology', match: /(topology|topological|manifold|homology|geometry)/, variant: 'secondary' as const },
      { label: 'theory', match: /(theorem|proof|theoretical|analysis|bound)/, variant: 'outline' as const },
      { label: 'optimization', match: /(optimization|gradient|objective|loss|convergence)/, variant: 'secondary' as const },
      { label: 'data systems', match: /(dataset|benchmark|retrieval|database|indexing|system)/, variant: 'outline' as const },
    ]

    const matches = catalog.filter((item) => item.match.test(source)).slice(0, 3)
    return matches.length > 0 ? matches : [{ label: 'research paper', variant: 'secondary' as const }]
  })()

  const paperSynthesis = (() => {
    const overview = getOverview()?.content?.trim()
    if (overview) {
      return overview
    }

    const aim = normalizedSections.find((section) => section.heading.toLowerCase() === 'aim')?.text.trim()
    const conclusion = normalizedSections.find((section) => section.heading.toLowerCase() === 'conclusion')?.text.trim()
    const limitations = normalizedSections.find((section) => section.heading.toLowerCase() === 'limitations')?.text.trim()
    const abstractSentences = (paperAbstract ?? '').split(/(?<=[.!?])\s+/).filter(Boolean)

    return [aim, conclusion, limitations ? `It also notes ${limitations.charAt(0).toLowerCase()}${limitations.slice(1)}` : null]
      .filter(Boolean)
      .slice(0, 3)
      .join(' ')
      || abstractSentences.slice(0, 3).join(' ')
      || 'A synthesized abstract will appear here once the paper sections are ready.'
  })()

  const statCells = (() => {
    const source = `${paperTitle} ${paperAbstract ?? ''} ${normalizedSections.map((section) => section.text).join(' ')}`.toLowerCase()
    const approachType =
      /survey|review/.test(source) ? 'Survey / review' :
        /benchmark|dataset/.test(source) ? 'Benchmark study' :
          /framework|system|pipeline/.test(source) ? 'System design' :
            /experiment|empirical/.test(source) ? 'Empirical study' :
              /theorem|proof|bound/.test(source) ? 'Theoretical analysis' :
                'Method paper'

    const validationStatus =
      /user study|human evaluation/.test(source) ? 'Validated with user study' :
        /benchmark|experiment|evaluation|results/.test(source) ? 'Empirically evaluated' :
          /simulation/.test(source) ? 'Validated in simulation' :
            /proof|theorem/.test(source) ? 'Validated analytically' :
              'Validation not explicit'

    return [
      { label: 'Approach type', value: approachType },
      { label: 'Validation status', value: validationStatus },
    ]
  })()

  const previewMessages = (() => {
    let assistantPreview: WorkspaceMessage | undefined
    let userPreview: WorkspaceMessage | undefined

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const current = messages[index]
      if (!assistantPreview && current.role === 'assistant') {
        assistantPreview = current
        continue
      }

      if (assistantPreview && current.role === 'user') {
        userPreview = current
        break
      }
    }

    if (userPreview && assistantPreview) {
      return [userPreview, assistantPreview]
    }

    return [
      {
        id: 'preview-user',
        role: 'user' as const,
        content: 'What is the main contribution of this paper?',
        referencedSectionIndices: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preview-assistant',
        role: 'assistant' as const,
        content: paperSynthesis,
        referencedSectionIndices: [],
        createdAt: new Date().toISOString(),
      },
    ]
  })()

  const sourceLabel = paperYear ? `arXiv · ${paperYear}` : 'arXiv'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
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
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="flex items-center justify-between gap-4 text-sm text-content-secondary">
            <button
              onClick={() => router.push('/research?tab=workspace')}
              className="inline-flex items-center rounded-lg px-2 py-1 transition-colors hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ← Back to workspace
            </button>
            <div className="rounded-full border border-border-cream bg-ivory px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-content-tertiary">
              {sourceLabel}
            </div>
          </section>

          <section className="space-y-4 rounded-[28px] border border-border-cream bg-ivory p-6 ring-shadow-warm sm:p-8">
            <div className="space-y-3">
              <h1 className="font-serif text-[2.3rem] font-medium leading-[1.1] text-content-primary sm:text-[2.9rem]">
                {paperTitle}
              </h1>
              <p className="text-base leading-relaxed text-content-secondary">
                {paperAuthors.join(', ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {domainTags.map((tag) => (
                <Badge key={tag.label} variant={tag.variant} className="rounded-full px-3">
                  {tag.label}
                </Badge>
              ))}
            </div>
          </section>

          <Card variant="ivory" className="rounded-[28px] border border-border-cream ring-shadow-warm">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-content-tertiary">Abstract</p>
              <p className="mt-3 text-base leading-relaxed text-content-secondary sm:text-[1.02rem]">
                {paperSynthesis}
              </p>
            </CardContent>
          </Card>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {statCells.map((cell) => (
              <div key={cell.label} className="rounded-2xl border border-border-cream bg-ivory p-5 ring-shadow-warm">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-content-tertiary">{cell.label}</p>
                <p className="mt-3 font-serif text-[1.35rem] font-medium leading-[1.2] text-content-primary">
                  {cell.value}
                </p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-[28px] border border-border-cream bg-ivory ring-shadow-warm">
            <div className="border-b border-border-cream px-6 py-4 sm:px-8">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-content-tertiary">Paper sections</p>
            </div>
            <div>
              {sections && sections.length > 0 ? (
                sections.map((section, index) => (
                  <div
                    key={`${section.heading}-${section.index}`}
                    className={`px-6 py-5 sm:px-8 ${index > 0 ? 'border-t border-border-cream' : ''}`}
                  >
                    <p className="font-serif text-[1.2rem] font-medium leading-[1.2] text-content-primary">
                      {section.heading}
                    </p>
                    <ContentRenderer
                      text={section.text}
                      className="mt-3 text-sm leading-relaxed text-content-secondary sm:text-[0.98rem]"
                    />
                  </div>
                ))
              ) : (
                <div className="px-6 py-5 sm:px-8">
                  <p className="text-sm leading-relaxed text-content-secondary">
                    {hasFullText
                      ? 'The LLM-generated paper sections are still being prepared.'
                      : 'Full text is not available yet, so the paper sections could not be generated.'}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-[28px] border border-border-cream bg-ivory p-6 ring-shadow-warm sm:p-8">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-content-tertiary">Chat thread</p>
              <p className="text-sm leading-relaxed text-content-secondary">
                A quick context preview before you continue the conversation.
              </p>
            </div>
            <div className="space-y-3">
              {previewMessages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user'
                    ? 'ml-auto max-w-[85%] bg-terracotta text-white ring-shadow-warm'
                    : 'mr-auto max-w-[90%] bg-background text-content-secondary ring-shadow-warm'
                    }`}
                >
                  <ContentRenderer text={message.content} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-border-cream bg-ivory p-6 ring-shadow-warm sm:p-8">
            <div className="flex items-end gap-3">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAskQuestion()
                  }
                }}
                placeholder="Ask a question about this paper…"
                disabled={isGenerating}
                className="min-h-[72px] rounded-2xl border-border bg-card px-4 py-3 text-content-primary placeholder:text-content-tertiary"
              />
              <button
                onClick={handleAskQuestion}
                disabled={!question.trim() || isGenerating}
                className="shrink-0 rounded-2xl bg-terracotta px-5 py-3 text-white shadow-[var(--terracotta)_0px_0px_0px_0px,var(--terracotta)_0px_0px_0px_1px] transition-all hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
