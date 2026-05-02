import { estimateTokens, callGemini as callGeminiClient } from '@/lib/geminiClient'
import type { ExtractedSection } from '@/lib/arxivFetcher'

type ChatMessage = {
  role: string
  content: string
}

type RelevantSection = {
  index: number
  heading: string
  text: string
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars).trimEnd()}…`
}

function normalizeOutput(text: string): string {
  return text.trim()
}

function buildPromptBlocks(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join('\n\n')
}

function getUsage(prompt: string, systemPrompt: string, output: string) {
  const inputTokens = estimateTokens(`${systemPrompt}\n${prompt}`)
  const outputTokens = estimateTokens(output)
  return { inputTokens, outputTokens }
}

export async function generatePaperOverview(params: {
  title: string
  authors: string[]
  abstract: string
  fullText: string | null
  userId: string
  sessionId: string
}): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const systemPrompt = 'You are a research paper analyst. Your task is to produce a structured analysis of a research paper. Be precise, accurate, and grounded in what the paper actually states. Do not speculate beyond what is written. Use clear, direct language. Avoid filler phrases.'
  const excerpt = params.fullText ? truncate(params.fullText, 6000) : null
  const prompt = buildPromptBlocks([
    'Analyze this research paper and provide a structured summary with the following sections. Use markdown headers for each section.',
    '## What This Paper Does\n2-3 sentences explaining the paper\'s core contribution in plain language. What problem does it solve? What does it propose?',
    '## Method\nExplain the methodology clearly. What approach, model, or technique does the paper introduce or use? What are the key components? Keep this precise but accessible.',
    '## Key Findings\nWhat did the experiments or analysis show? List the 3-5 most important results. Include specific numbers or metrics where the paper states them.',
    '## Conclusions\nWhat does the paper conclude? What claims do the authors make based on their results?',
    '## Limitations\nWhat limitations do the authors acknowledge? What are the weaknesses of this approach that a careful reader would notice even if not explicitly stated?',
    '## Potential Future Research\nBased on the limitations and open questions in this paper, what research directions does this work suggest? List 3-5 specific, actionable future directions.',
    `Paper title: ${params.title}`,
    `Authors: ${params.authors.join(', ') || 'Unknown authors'}`,
    `Abstract: ${params.abstract}`,
    excerpt ? `Paper excerpt:\n${excerpt}` : null,
  ])

  const raw = await callGeminiClient({
    model: 'gemini-2.5-flash',
    prompt,
    systemPrompt,
    temperature: 0.2,
    maxOutputTokens: 1500,
    feature: 'paper_overview',
    userId: params.userId,
  })

  const content = normalizeOutput(raw)
  const usage = getUsage(prompt, systemPrompt, content)
  return { content, ...usage }
}

export async function generateSectionSummary(params: {
  paperTitle: string
  sectionHeading: string
  sectionText: string
  userId: string
  sessionId: string
}): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const systemPrompt = 'You are a research paper section explainer. Explain what this section says clearly and accurately. Do not add information not present in the text.'
  const prompt = buildPromptBlocks([
    `Explain this section of the paper '${params.paperTitle}'.`,
    `Section: ${params.sectionHeading}`,
    truncate(params.sectionText, 4000),
    'Provide:\n1. What this section covers (1-2 sentences)\n2. The key points or findings in this section (bullet list)\n3. Why this section matters to the paper\'s overall argument (1 sentence)',
  ])

  const raw = await callGeminiClient({
    model: 'gemini-2.5-flash',
    prompt,
    systemPrompt,
    temperature: 0.2,
    maxOutputTokens: 600,
    feature: 'section_summary',
    userId: params.userId,
  })

  const content = normalizeOutput(raw)
  const usage = getUsage(prompt, systemPrompt, content)
  return { content, ...usage }
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'what',
  'which',
  'with',
])

function tokenizeQuestion(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

export function selectRelevantSections(question: string, sections: ExtractedSection[]): RelevantSection[] {
  if (sections.length === 0) return []

  const tokens = tokenizeQuestion(question)
  const scored = sections.map((section) => {
    const haystack = `${section.heading} ${truncate(section.text.toLowerCase(), 200)}`
    const score = tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0)
    return { section, score }
  })

  scored.sort((left, right) => right.score - left.score || left.section.index - right.section.index)

  if ((scored[0]?.score ?? 0) === 0) {
    const fallback = sections.find((section) => /abstract|introduction/i.test(section.heading)) ?? sections[0]
    return [{ index: fallback.index, heading: fallback.heading, text: fallback.text }]
  }

  return scored.slice(0, 3).map(({ section }) => ({ index: section.index, heading: section.heading, text: section.text }))
}

function buildRelevantSectionContext(relevantSections: RelevantSection[]): { text: string; referencedSectionIndices: number[] } {
  const selected: string[] = []
  const referencedSectionIndices: number[] = []
  let totalChars = 0

  for (const section of relevantSections.slice(0, 3)) {
    const block = `${section.heading}\n${truncate(section.text, 1500)}`
    if (totalChars + block.length > 5000 && selected.length > 0) {
      break
    }
    selected.push(block)
    referencedSectionIndices.push(section.index)
    totalChars += block.length
  }

  return {
    text: selected.join('\n\n'),
    referencedSectionIndices,
  }
}

function buildMessageHistory(history: ChatMessage[]): string | null {
  const recent = history.slice(-4)
  if (recent.length === 0) return null
  return recent.map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`).join('\n')
}

export async function generateQAResponse(params: {
  paperTitle: string
  question: string
  relevantSections: RelevantSection[]
  messageHistory: ChatMessage[]
  userId: string
  sessionId: string
}): Promise<{ content: string; inputTokens: number; outputTokens: number; referencedSectionIndices: number[] }> {
  const systemPrompt = 'You are a research paper Q&A assistant. Answer questions about this paper using only information present in the provided sections. If the answer is not in the provided text, say so explicitly. Do not fabricate data, citations, or claims not present in the paper. Be concise and precise.'
  const context = buildRelevantSectionContext(params.relevantSections)
  const history = buildMessageHistory(params.messageHistory)
  const prompt = buildPromptBlocks([
    `Paper: ${params.paperTitle}`,
    history ? `Recent conversation:\n${history}` : null,
    `Relevant sections:\n${context.text}`,
    `Question: ${params.question}`,
    'Answer the question using only the paper content above.',
  ])

  const raw = await callGeminiClient({
    model: 'gemini-2.5-flash',
    prompt,
    systemPrompt,
    temperature: 0.3,
    maxOutputTokens: 800,
    feature: 'qa_response',
    userId: params.userId,
  })

  const content = normalizeOutput(raw)
  const usage = getUsage(prompt, systemPrompt, content)
  return {
    content,
    ...usage,
    referencedSectionIndices: context.referencedSectionIndices,
  }
}
