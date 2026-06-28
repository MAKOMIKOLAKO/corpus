// HIDDEN — feature disabled, do not import
'use client'

import { useState } from 'react'
import { Plus, Download, BookOpen, Copy, Check } from 'lucide-react'
import { formatCitation, type CitationStyle, type BibliographyEntry } from '@/lib/bibliography'

interface CiteTabProps {
  paper: {
    title: string
    authors: string[]
    year: number | null
    source: string | null
    doi: string | null
    url: string | null
  }
}

export function CiteTab({ paper }: CiteTabProps) {
  const [style, setStyle] = useState<CitationStyle>('APA')
  const [bibliography, setBibliography] = useState<BibliographyEntry[]>([])
  const [copied, setCopied] = useState(false)

  const formattedCitation = formatCitation(
    {
      userEntryId: '',
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      source: paper.source,
      doi: paper.doi,
      url: paper.url,
    },
    style
  )

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCitation.citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddToBibliography = () => {
    if (!paper.title) return
    if (!bibliography.find((b) => b.title === paper.title)) {
      setBibliography([
        ...bibliography,
        {
          userEntryId: '',
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          source: paper.source,
          doi: paper.doi,
          url: paper.url,
        },
      ])
    }
  }

  const handleRemoveFromBibliography = (title: string | null | undefined) => {
    if (!title) return
    setBibliography(bibliography.filter((b) => b.title !== title))
  }

  const handleExportBibliography = () => {
    const text = bibliography
      .map((entry) => formatCitation(entry, style).citation)
      .join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bibliography-${style.toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-medium text-content-primary">Cite</h3>
        <div className="flex items-center gap-2">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as CitationStyle)}
            className="text-sm border border-border rounded-lg bg-card px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="APA">APA</option>
            <option value="MLA">MLA</option>
            <option value="CHICAGO">Chicago</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Current Paper Citation */}
        <div className="mb-6">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-content-primary mb-1">
                  {paper.title}
                </h4>
                <p className="text-xs text-content-tertiary">
                  {paper.authors.slice(0, 3).join(', ')}
                  {paper.authors.length > 3 && ' et al.'}
                  {paper.year && ` · ${paper.year}`}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-sunken mb-3">
              <p className="text-sm text-content-secondary font-mono">
                {formattedCitation.citation}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-sunken border border-border text-content-secondary hover:border-accent transition-colors text-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleAddToBibliography}
                disabled={!paper.title || bibliography.find((b) => b.title === paper.title) !== undefined}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                {paper.title && bibliography.find((b) => b.title === paper.title) ? 'Added' : 'Add to bibliography'}
              </button>
            </div>
          </div>
        </div>

        {/* Active Bibliography */}
        {bibliography.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-content-primary flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Active Bibliography ({bibliography.length})
              </h4>
              <button
                onClick={handleExportBibliography}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-sunken border border-border text-content-secondary hover:border-accent transition-colors text-sm"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
            <div className="space-y-2">
              {bibliography.map((entry) => (
                <div
                  key={entry.title}
                  className="p-3 rounded-lg border border-border bg-card flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm text-content-secondary font-mono">
                      {formatCitation(entry, style).citation}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveFromBibliography(entry.title)}
                    className="p-1 rounded hover:bg-surface-sunken text-content-tertiary hover:text-content-primary transition-colors"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {bibliography.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-content-tertiary mx-auto mb-2" />
            <p className="text-sm text-content-secondary">
              Your bibliography is empty
            </p>
            <p className="text-xs text-content-tertiary mt-1">
              Add papers to build your bibliography
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
