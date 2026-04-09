'use client'

import { useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CitationStyle, formatCitation } from '@/lib/bibliography'

interface SingleEntryCitationModalProps {
  isOpen: boolean
  onClose: () => void
  entry: {
    id: string
    title: string
    authors: string[]
    year: number | null
    source: string | null
    url: string | null
    doi: string | null
    abstract?: string | null
    isbn?: string | null
    metadata?: Record<string, any> | null
  }
}

export default function SingleEntryCitationModal({ isOpen, onClose, entry }: SingleEntryCitationModalProps) {
  const [style, setStyle] = useState<CitationStyle>('APA')

  const citation = useMemo(() => {
    return formatCitation(
      {
        userEntryId: entry.id,
        title: entry.title,
        authors: entry.authors,
        year: entry.year,
        source: entry.source,
        url: entry.url,
        doi: entry.doi,
        abstract: entry.abstract,
        isbn: entry.isbn,
        metadata: entry.metadata || null,
      },
      style
    ).citation
  }, [entry, style])

  async function copy() {
    try {
      await navigator.clipboard.writeText(citation)
    } catch {
      const el = document.createElement('textarea')
      el.value = citation
      el.style.position = 'absolute'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cite this entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(['APA', 'MLA', 'CHICAGO'] as CitationStyle[]).map((option) => (
              <Button
                key={option}
                type="button"
                variant={style === option ? 'default' : 'outline'}
                onClick={() => setStyle(option)}
              >
                {option}
              </Button>
            ))}
          </div>

          <textarea
            readOnly
            value={citation}
            className="w-full h-36 rounded border p-3 text-sm font-serif"
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={copy}>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
