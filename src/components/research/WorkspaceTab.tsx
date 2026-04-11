'use client'

import { useState } from 'react'
import { Link, FileText, Upload, Type, BookOpen, Loader2, Clock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface WorkspaceTabProps {
  userId: string
  plan: string
}

function normalizeWorkspacePaperInput(input: string): string {
  const trimmed = input.trim()

  const doiMatch = trimmed.match(/10\.\d{4,9}\/[\w.()/:;-]+/i)
  if (doiMatch) return doiMatch[0]

  const arxivUrlMatch = trimmed.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i)
  if (arxivUrlMatch) {
    const cleaned = arxivUrlMatch[1].replace(/\.pdf$/i, '').trim()
    const idMatch = cleaned.match(/(\d{4}\.\d{4,5})(?:v\d+)?$/i)
    if (idMatch) return idMatch[1]
    return cleaned
  }

  const directArxivMatch = trimmed.match(/^(\d{4}\.\d{4,5})(?:v\d+)?$/i)
  if (directArxivMatch) return directArxivMatch[1]

  return trimmed
}

export function WorkspaceTab({ userId, plan }: WorkspaceTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('sessionId')

  const [inputMethod, setInputMethod] = useState<'arxiv' | 'pdf' | 'text' | 'library'>('arxiv')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<'fetching' | 'extracting' | 'ready'>('fetching')

  const handleLoadPaper = async () => {
    if (!inputValue.trim()) return

    setIsLoading(true)
    setLoadingStage('fetching')

    try {
      const paperId = inputMethod === 'arxiv'
        ? normalizeWorkspacePaperInput(inputValue)
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
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${inputMethod === 'arxiv'
                    ? 'border-accent bg-accent/5 ring-shadow'
                    : 'border-border hover:border-border-strong ring-shadow-warm'
                    }`}
                >
                  <Link className="w-5 h-5" />
                  <span className="text-sm font-medium">arXiv / DOI</span>
                </button>
                <button
                  onClick={() => setInputMethod('pdf')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${inputMethod === 'pdf'
                    ? 'border-accent bg-accent/5 ring-shadow'
                    : 'border-border hover:border-border-strong ring-shadow-warm'
                    }`}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload PDF</span>
                </button>
                <button
                  onClick={() => setInputMethod('text')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${inputMethod === 'text'
                    ? 'border-accent bg-accent/5 ring-shadow'
                    : 'border-border hover:border-border-strong ring-shadow-warm'
                    }`}
                >
                  <Type className="w-5 h-5" />
                  <span className="text-sm font-medium">Paste Text</span>
                </button>
                <button
                  onClick={() => setInputMethod('library')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${inputMethod === 'library'
                    ? 'border-accent bg-accent/5 ring-shadow'
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
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
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
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
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
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                    <p className="text-sm text-content-tertiary">
                      Library search coming soon
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
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
              <div className="border border-border rounded-xl p-8 text-center whisper-shadow">
                <FileText className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
                <p className="text-content-secondary mb-2">
                  Paper viewer and analysis tools coming soon
                </p>
                <p className="text-sm text-content-tertiary">
                  Session ID: {sessionId}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
