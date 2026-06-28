// HIDDEN — feature disabled, do not import
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Sparkles, 
  MessageSquare, 
  History, 
  ChevronRight, 
  BadgeCheck,
  Loader2,
  Terminal,
  BookOpen
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ReadingAssistantProps {
  sessionId: string
  initialMessages?: Message[]
  paperTitle?: string
}

export function ReadingAssistant({ sessionId, initialMessages = [], paperTitle }: ReadingAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [methodologyLoading, setMethodologyLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/research/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg })
      })
      const data = await res.json()
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMethodologyBreakdown = async () => {
    if (methodologyLoading) return
    setMethodologyLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: "Explain the methodology used in this paper in detail." }])

    try {
      const res = await fetch(`/api/research/read/methodology?sessionId=${sessionId}`)
      const data = await res.json()
      if (data.breakdown) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.breakdown }])
      }
    } catch (err) {
      console.error('Failed to get methodology:', err)
    } finally {
      setMethodologyLoading(false)
    }
  }

  const suggestedQuestions = [
    "What is the main finding?",
    "Explain the experimental setup.",
    "What are the limitations?",
    "How does this compare to related work?"
  ]

  return (
    <div className="flex flex-col h-full bg-card border-l border-border shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-accent w-4 h-4" />
          <h2 className="text-sm font-semibold text-content-primary">Research Assistant</h2>
        </div>
        <p className="text-[11px] text-content-tertiary truncate max-w-[200px]" title={paperTitle}>
          Discussing: {paperTitle || 'Loading paper...'}
        </p>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="text-accent w-5 h-5" />
              </div>
              <p className="text-xs text-content-secondary leading-relaxed px-4">
                Ask anything about the methodology, results, or implications of this paper.
              </p>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-surface-sunken text-content-primary border border-border-strong'
                }`}
              >
                {msg.content.split('\n').map((line, idx) => (
                  <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-surface-sunken rounded-2xl p-3 border border-border-strong">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions & Input */}
      <div className="p-4 border-t border-border space-y-3 bg-card">
        {messages.length < 5 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMethodologyBreakdown}
              disabled={methodologyLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-full bg-surface-sunken border border-border-strong hover:border-accent text-content-secondary transition-all"
            >
              <Terminal className="w-3 h-3" />
              {methodologyLoading ? 'Analyzing...' : 'Methodology Breakdown'}
            </button>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="px-3 py-1 text-[11px] font-medium rounded-full bg-surface-sunken border border-border-strong hover:border-border-strong text-content-tertiary transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className="w-full bg-surface-sunken border border-border-strong focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none rounded-xl py-2.5 pl-4 pr-12 text-sm text-content-primary transition-all placeholder:text-content-tertiary"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:bg-content-tertiary"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-center text-content-tertiary">
          Assistant uses paper sections for context.
        </p>
      </div>
    </div>
  )
}
