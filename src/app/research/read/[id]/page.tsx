'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  BookOpen, 
  Layout, 
  Loader2, 
  Github,
  ChevronRight,
  Split,
  Maximize2,
  FileText
} from 'lucide-react'
import { ReadingAssistant } from '@/components/research/ReadingAssistant'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface PaperSection {
  title: string
  content: string
}

interface ReadingSession {
  id: string
  candidatePaperId: string
  paperText: string
  sections: PaperSection[]
  messages: any[]
}

export default function ReadingPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [session, setSession] = useState<ReadingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch(`/api/research/read?paperId=${id}`)
        if (res.status === 403) {
          router.push('/pricing?reason=pro_reading_assistant')
          return
        }
        if (!res.ok) throw new Error('Failed to load paper')
        const data = await res.json()
        setSession(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    initSession()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
        <h2 className="text-xl font-medium font-serif">Analyzing Paper...</h2>
        <p className="text-content-tertiary mt-2">Extracting sections and initializing assistant</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background">
        <h2 className="text-xl font-medium font-serif text-destructive">Failed to Load</h2>
        <p className="text-content-tertiary mt-2">{error || 'Unknown error'}</p>
        <Link href="/research" className="mt-6 text-accent hover:underline flex items-center gap-1">
          <ArrowLeft size={16} /> Back to Feed
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          <Link 
            href="/research" 
            className="p-2 -ml-2 rounded-full hover:bg-surface-sunken text-content-tertiary transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-serif font-medium leading-none truncate max-w-[500px]">
              {session.paperText.split('\n')[0].replace('Title: ', '')}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] uppercase tracking-wider text-accent font-semibold px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                Active Mode
              </span>
              <span className="text-[11px] text-content-tertiary">
                {session.sections.length} Sections Extracted
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-surface-sunken text-content-tertiary transition-colors">
            <Layout size={18} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Paper Content Area */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#faf9f5] dark:bg-[#1a1a19]">
          <div className="max-w-3xl mx-auto space-y-12 pb-20">
            {session.sections.map((section, idx) => (
              <motion.section 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-4"
              >
                <h2 className="text-2xl font-serif text-content-primary border-b border-border-strong pb-2">
                  {section.title}
                </h2>
                <div className="serif-body text-content-secondary leading-[1.8] whitespace-pre-wrap">
                  {section.content}
                </div>
              </motion.section>
            ))}
            
            <div className="pt-10 border-t border-border-strong text-center">
              <p className="text-content-tertiary italic text-sm">
                End of extracted content. Ask the assistant for more details.
              </p>
            </div>
          </div>
        </main>

        {/* Sidebar Assistant */}
        <aside className="w-[400px] shrink-0 h-full">
          <ReadingAssistant 
            sessionId={session.id} 
            initialMessages={session.messages.map((m: any) => ({
              role: m.role,
              content: m.content
            }))}
            paperTitle={session.paperText.split('\n')[0].replace('Title: ', '')}
          />
        </aside>
      </div>
    </div>
  )
}
