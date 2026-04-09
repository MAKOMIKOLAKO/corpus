'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Download, Loader2, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CitationStyle, BibliographyOrdering } from '@/lib/bibliography'

interface MissingFieldWarning {
  entryId: string
  fields: string[]
}

interface GroupedSection {
  heading: string
  citations: string[]
}

interface GenerationResponse {
  bibliography: string
  relatedWork: string | null
  citationCount: number
  deduplicatedCount: number
  missingFieldWarnings: MissingFieldWarning[]
  groupedSections: GroupedSection[] | null
}

interface BibliographyGenerateDialogProps {
  isOpen: boolean
  onClose: () => void
  userEntryIds: string[]
  defaultTitle?: string
  onProRequired?: () => void
}

const STYLE_OPTIONS: Array<{ value: CitationStyle; label: string; example: string }> = [
  { value: 'APA', label: 'APA', example: 'Smith, J. (2024).' },
  { value: 'MLA', label: 'MLA', example: 'Smith, John. 2024.' },
  { value: 'CHICAGO', label: 'Chicago', example: 'Smith, John. 2024.' },
]

const ORDERING_OPTIONS: Array<{ value: BibliographyOrdering; label: string }> = [
  { value: 'ALPHABETICAL', label: 'Alphabetical by author' },
  { value: 'CHRONOLOGICAL', label: 'Chronological' },
  { value: 'SELECTION', label: 'Order of selection' },
]

export default function BibliographyGenerateDialog({
  isOpen,
  onClose,
  userEntryIds,
  defaultTitle,
  onProRequired,
}: BibliographyGenerateDialogProps) {
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA')
  const [ordering, setOrdering] = useState<BibliographyOrdering>('ALPHABETICAL')
  const [groupByType, setGroupByType] = useState(false)
  const [includeRelatedWork, setIncludeRelatedWork] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerationResponse | null>(null)
  const [saved, setSaved] = useState(false)

  const loadingMessages = useMemo(() => {
    const base = ['Formatting citations...', 'Checking for duplicates...', 'Almost done...']
    if (includeRelatedWork) base.push('Generating summary...')
    return base
  }, [includeRelatedWork])

  useEffect(() => {
    if (!loading) return

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((value) => (value + 1) % loadingMessages.length)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [loading, loadingMessages.length])

  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setLoading(false)
      setLoadingMessageIndex(0)
    }
  }, [isOpen])

  const summaryText = result
    ? `${result.citationCount} citations · ${citationStyle} · ${ordering}${
        result.deduplicatedCount > 0 ? ` (${result.deduplicatedCount} duplicates removed)` : ''
      }${
        result.missingFieldWarnings.length > 0
          ? ` (${result.missingFieldWarnings.length} entries had missing fields)`
          : ''
      }`
    : ''

  const bibliographyOnlyText = useMemo(() => {
    if (!result) return ''
    if (result.groupedSections && result.groupedSections.length > 0) {
      return result.groupedSections
        .map((section) => `${section.heading}\n${section.citations.join('\n\n')}`)
        .join('\n\n')
    }

    if (!result.relatedWork) return result.bibliography

    const relatedBlock = `Related Work\n${result.relatedWork}`
    return result.bibliography.replace(`${relatedBlock}\n\n`, '')
  }, [result])

  const canGenerate = userEntryIds.length >= 2 && userEntryIds.length <= 200 && !loading

  async function runGeneration() {
    if (!canGenerate) return

    setError(null)
    setSaved(false)
    setLoading(true)
    setLoadingMessageIndex(0)

    try {
      const response = await fetch('/api/bibliography/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEntryIds,
          citationStyle,
          ordering,
          groupByType,
          includeRelatedWork,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data?.error === 'bibliography_pro_only') {
          onProRequired?.()
          onClose()
          return
        }
        setError(data?.error || 'Failed to generate bibliography')
        return
      }

      setResult(data)
    } catch {
      setError('Failed to generate bibliography')
    } finally {
      setLoading(false)
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const el = document.createElement('textarea')
      el.value = value
      el.style.position = 'absolute'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
  }

  async function saveBibliography() {
    if (!result) return

    const response = await fetch('/api/bibliography/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEntryIds,
        citationStyle,
        ordering,
        title: defaultTitle || null,
        content: result.bibliography,
        relatedWorkParagraph: result.relatedWork,
      }),
    })

    if (response.ok) {
      setSaved(true)
    }
  }

  function downloadText(content: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    anchor.href = url
    anchor.download = `bibliography-${timestamp}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{result ? 'Bibliography Output' : 'Generate Bibliography'}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Citation Style</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCitationStyle(option.value)}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      citationStyle === option.value ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{option.example}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Ordering</p>
              <div className="grid gap-2">
                {ORDERING_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={ordering === option.value}
                      onChange={() => setOrdering(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={groupByType}
                  onChange={(event) => setGroupByType(event.target.checked)}
                />
                Group by source type
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeRelatedWork}
                  onChange={(event) => setIncludeRelatedWork(event.target.checked)}
                />
                Generate Related Work paragraph
              </label>
              {includeRelatedWork && (
                <p className="text-xs text-muted-foreground">Uses AI — adds a few seconds</p>
              )}
            </div>

            <div className="text-sm text-muted-foreground">{userEntryIds.length} entries selected</div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={runGeneration} disabled={!canGenerate} title={canGenerate ? '' : 'Select at least 2 entries'}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loadingMessages[loadingMessageIndex]}
                  </span>
                ) : (
                  'Generate Bibliography'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-medium">{summaryText}</div>

            {result.missingFieldWarnings.length > 0 && (
              <details className="rounded border p-3 text-sm">
                <summary className="cursor-pointer font-medium">Missing field warnings</summary>
                <div className="mt-2 space-y-2">
                  {result.missingFieldWarnings.map((warning) => (
                    <div key={warning.entryId}>
                      <span className="font-medium">{warning.entryId}</span>: {warning.fields.join(', ')}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {result.relatedWork && (
              <section className="rounded border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Related Work</h3>
                  <Button variant="outline" size="sm" onClick={() => copyText(result.relatedWork || '')}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Paragraph
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{result.relatedWork}</p>
              </section>
            )}

            <textarea
              readOnly
              value={result.bibliography}
              className="w-full h-72 rounded border p-3 font-serif text-sm leading-6"
            />

            <div className="flex flex-wrap gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => copyText(result.bibliography)}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={() => copyText(bibliographyOnlyText)}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Citations Only
                </Button>
                <Button variant="outline" onClick={() => downloadText(result.bibliography)}>
                  <Download className="w-3 h-3 mr-1" />
                  Download .txt
                </Button>
                <Button variant="outline" onClick={saveBibliography}>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                {saved && <span className="text-xs text-green-600 self-center">Saved</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setResult(null)}>
                  Back
                </Button>
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
