'use client'

import { useState } from 'react'
import { Link, FileText, Upload, Type, BookOpen, Loader2, Clock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface WorkspaceTabProps {
  userId: string
  plan: string
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
      let paperId = inputValue

      // Determine paperId based on input method
      if (inputMethod === 'arxiv') {
        // Extract arXiv ID or DOI from URL
        const arxivMatch = inputValue.match(/arxiv\.org\/abs\/(\d+\.\d+)/)
        const doiMatch = inputValue.match(/10\.\d{4,9}\/[\w.()/:;-]+/)
        if (arxivMatch) {
          paperId = arxivMatch[1]
        } else if (doiMatch) {
          paperId = inputValue // Use DOI directly
        }
      }

      // Call the existing /api/research/read endpoint
      const res = await fetch(`/api/research/read?paperId=${encodeURIComponent(paperId)}`, {
        method: 'POST',
      })

      if (res.status === 403) {
        router.push('/pricing?reason=reading_assistant_pro_only')
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load paper')
      }

      const data = await res.json()
      setLoadingStage('extracting')
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Brief delay for UX
      setLoadingStage('ready')

      // Navigate to the workspace with the session ID
      router.push(`/research?tab=workspace&sessionId=${data.id}`)
    } catch (error) {
      console.error('Failed to load paper:', error)
      alert('Failed to load paper. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
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
        <div className="flex-1 flex">
          {/* Left Pane - Paper Input / Viewer */}
          <div className="w-full lg:w-[40%] border-r border-border">
            {!sessionId ? (
              <div className="p-6">
                <h2 className="text-xl font-serif font-medium text-content-primary mb-6">
                  Load a paper to analyze
                </h2>

                {/* Input Method Selector */}
                <div className="flex gap-2 mb-6 bg-surface-sunken p-1 rounded-lg">
                  <button
                    onClick={() => setInputMethod('arxiv')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMethod === 'arxiv'
                      ? 'bg-card text-content-primary shadow-sm'
                      : 'text-content-secondary hover:text-content-primary'
                      }`}
                  >
                    <Link className="w-4 h-4" />
                    arXiv / DOI
                  </button>
                  <button
                    onClick={() => setInputMethod('pdf')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMethod === 'pdf'
                      ? 'bg-card text-content-primary shadow-sm'
                      : 'text-content-secondary hover:text-content-primary'
                      }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload PDF
                  </button>
                  <button
                    onClick={() => setInputMethod('text')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMethod === 'text'
                      ? 'bg-card text-content-primary shadow-sm'
                      : 'text-content-secondary hover:text-content-primary'
                      }`}
                  >
                    <Type className="w-4 h-4" />
                    Paste text
                  </button>
                  <button
                    onClick={() => setInputMethod('library')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMethod === 'library'
                      ? 'bg-card text-content-primary shadow-sm'
                      : 'text-content-secondary hover:text-content-primary'
                      }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Library
                  </button>
                </div>

                {/* Input Area */}
                {inputMethod === 'arxiv' && (
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Paste arXiv URL or DOI
                    </label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="https://arxiv.org/abs/2301.00000 or 10.1000/xyz123"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-4"
                    />
                  </div>
                )}

                {inputMethod === 'pdf' && (
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Upload PDF file
                    </label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition-colors">
                      <Upload className="w-8 h-8 text-content-tertiary mx-auto mb-2" />
                      <p className="text-sm text-content-secondary mb-1">
                        Drag and drop PDF here
                      </p>
                      <p className="text-xs text-content-tertiary">
                        or click to browse
                      </p>
                      <input type="file" accept=".pdf" className="hidden" />
                    </div>
                  </div>
                )}

                {inputMethod === 'text' && (
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Paste paper text or abstract
                    </label>
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Paste the full paper text or abstract here..."
                      rows={10}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-4 resize-none"
                    />
                  </div>
                )}

                {inputMethod === 'library' && (
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Search your library
                    </label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Search saved papers..."
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-4"
                    />
                    <p className="text-xs text-content-tertiary">
                      Library search coming soon
                    </p>
                  </div>
                )}

                {/* Load Button */}
                {(inputMethod === 'arxiv' || inputMethod === 'text') && (
                  <button
                    onClick={handleLoadPaper}
                    disabled={!inputValue.trim()}
                    className="w-full py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Load Paper
                  </button>
                )}

                {/* Recent Papers */}
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-content-secondary mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent papers
                  </h3>
                  <div className="text-sm text-content-tertiary">
                    Recent papers will appear here
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="p-6">
                  <p className="text-content-secondary">
                    Paper viewer coming soon
                  </p>
                  <p className="text-content-tertiary text-sm mt-2">
                    Session ID: {sessionId}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Pane - Analysis Panel */}
          <div className="hidden lg:block w-[60%]">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium">
                    Understand
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-surface-sunken text-content-secondary text-sm font-medium hover:text-content-primary">
                    Ask
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-surface-sunken text-content-secondary text-sm font-medium hover:text-content-primary">
                    Notes
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-surface-sunken text-content-secondary text-sm font-medium hover:text-content-primary">
                    Cite
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6">
                <p className="text-content-secondary">Analysis panel coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Toggle */}
      <div className="lg:hidden border-t border-border bg-card p-4">
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium">
            View Document
          </button>
          <button className="flex-1 py-2 rounded-lg bg-surface-sunken text-content-secondary text-sm font-medium">
            Analysis
          </button>
        </div>
      </div>
    </div>
  )
}
