'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookmarkPlus,
  EyeOff,
  BookOpen,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Tag,
} from 'lucide-react'
import type { PaperSummaryObject } from '@/lib/research/feedPipeline'

interface PaperCardProps {
  paper: PaperSummaryObject
  onSave: (paperId: string) => Promise<void>
  onDismiss: (paperId: string) => Promise<void>
  highlightCluster?: boolean
}

const NOVELTY_COLORS: Record<string, string> = {
  'New method':             'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40',
  'New dataset':            'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  'State-of-the-art result':'bg-violet-900/40 text-violet-300 border border-violet-700/40',
  'Survey':                 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
  'Theoretical':            'bg-rose-900/40 text-rose-300 border border-rose-700/40',
  'Replication':            'bg-gray-800/60 text-gray-400 border border-gray-600/40',
  'Interdisciplinary':      'bg-orange-900/40 text-orange-300 border border-orange-700/40',
}

export function PaperCard({ paper, onSave, onDismiss, highlightCluster }: PaperCardProps) {
  const [showTechnical, setShowTechnical] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [saved, setSaved] = useState(paper.alreadySaved)

  if (dismissed) return null

  const authorStr = paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
  const year = paper.year ?? (paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : null)
  const noveltyColor = NOVELTY_COLORS[paper.noveltyTag] ?? 'bg-gray-800/60 text-gray-400 border border-gray-600/40'

  async function handleSave() {
    if (saved || saving) return
    setSaving(true)
    try {
      await onSave(paper.candidatePaperId)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDismiss() {
    if (dismissing) return
    setDismissing(true)
    try {
      await onDismiss(paper.candidatePaperId)
      setDismissed(true)
    } finally {
      setDismissing(false)
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-xl border border-[#30302e] bg-[#1c1c1a] p-5 shadow-sm hover:border-[#3d3d3a] transition-colors"
      aria-label={`Research paper: ${paper.title}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${noveltyColor}`}>
              <Tag size={10} />
              {paper.noveltyTag}
            </span>
            {paper.clusterLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#3d3d3a] bg-[#30302e]/60 px-2 py-0.5 text-[11px] text-[#87867f]">
                {paper.clusterLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-semibold leading-snug text-[#faf9f5] mb-1">
            {paper.url || paper.doi ? (
              <a
                href={paper.url ?? `https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#c96442] transition-colors inline-flex items-center gap-1"
              >
                {paper.title}
                <ExternalLink size={12} className="shrink-0 opacity-50" />
              </a>
            ) : (
              paper.title
            )}
          </h3>

          {/* Authors + year */}
          <p className="text-[13px] text-[#87867f]">
            {authorStr}{year ? ` · ${year}` : ''}{paper.source ? ` · ${paper.source}` : ''}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3">
        <p className="text-[14px] leading-relaxed text-[#b0aea5]">
          {showTechnical ? paper.technicalSummary : paper.plainSummary}
        </p>
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-[#5e5d59] hover:text-[#87867f] transition-colors"
        >
          {showTechnical ? (
            <><ChevronUp size={12} /> Plain language</>
          ) : (
            <><ChevronDown size={12} /> Technical summary</>
          )}
        </button>
      </div>

      {/* Why this paper */}
      {paper.whyExplanation && (
        <div className="mt-3 rounded-lg border border-[#c96442]/20 bg-[#c96442]/5 px-3.5 py-2.5">
          <div className="flex items-start gap-2">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-[#c96442]" />
            <p className="text-[13px] leading-relaxed text-[#d97757]">
              {paper.whyExplanation}
            </p>
          </div>
        </div>
      )}

      {/* Open access notice */}
      {paper.openAccessUrl && (
        <a
          href={paper.openAccessUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#5e5d59] hover:text-[#87867f] transition-colors"
        >
          <ExternalLink size={11} />
          Open access PDF
        </a>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          id={`save-paper-${paper.candidatePaperId}`}
          onClick={handleSave}
          disabled={saved || saving}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
            saved
              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30 cursor-default'
              : 'bg-[#30302e] text-[#b0aea5] border border-[#3d3d3a] hover:bg-[#c96442] hover:text-[#faf9f5] hover:border-[#c96442]'
          }`}
          aria-label={saved ? 'Paper saved to library' : 'Save paper to library'}
        >
          <BookmarkPlus size={13} />
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save to Library'}
        </button>

        <button
          id={`dismiss-paper-${paper.candidatePaperId}`}
          onClick={handleDismiss}
          disabled={dismissing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#3d3d3a] bg-transparent px-3 py-1.5 text-[13px] text-[#5e5d59] hover:text-[#87867f] hover:border-[#5e5d59] transition-all"
          aria-label="Dismiss this paper from feed"
        >
          <EyeOff size={13} />
          Dismiss
        </button>

        {/* Placeholder for reading assistant — Phase 2 */}
        <button
          id={`read-paper-${paper.candidatePaperId}`}
          disabled
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#30302e] bg-transparent px-3 py-1.5 text-[13px] text-[#3d3d3a] cursor-not-allowed"
          title="Reading Assistant available in a future update"
          aria-label="Reading assistant - coming soon"
        >
          <BookOpen size={13} />
          Read
        </button>
      </div>
    </motion.article>
  )
}
