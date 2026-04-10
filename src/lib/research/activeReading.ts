import * as cheerio from 'cheerio'
import prisma from '@/lib/prisma'
import { callGemini, safeParseJson } from './geminiResearch'
import { Prisma } from '@prisma/client'

export interface PaperSection {
  title: string
  content: string
}

/**
 * Fetch paper content from external sources (primarily ar5iv for arXiv).
 */
export async function fetchPaperContent(candidatePaperId: string): Promise<string> {
  const paper = await (prisma as any).candidatePaper.findUnique({
    where: { id: candidatePaperId },
    select: { arxivId: true, url: true, title: true, abstract: true }
  })

  if (!paper) throw new Error('Paper not found')

  // ArXiv papers are best fetched via ar5iv.org (HTML version)
  if (paper.arxivId) {
    try {
      const ar5ivUrl = `https://ar5iv.org/abs/${paper.arxivId}`
      const response = await fetch(ar5ivUrl)
      if (response.ok) {
        const html = await response.text()
        const $ = cheerio.load(html)
        
        // Remove scripts, styles, and navigation elements
        $('script, style, nav, .ltx_page_footer, .ltx_page_header').remove()
        
        // Extract the main content (usually in .ltx_page_main or article)
        let mainContent = $('.ltx_page_main').text() || $('article').text() || $('body').text()
        
        // Clean up whitespace
        mainContent = mainContent.replace(/\s+/g, ' ').trim()
        
        if (mainContent.length > 500) {
          return mainContent
        }
      }
    } catch (err) {
      console.error(`[activeReading] Failed to fetch ar5iv for ${paper.arxivId}:`, err)
    }
  }

  // Fallback to abstract if full text fails or isn't available
  return `Title: ${paper.title}\n\nAbstract: ${paper.abstract}\n\n[Full text extraction failed or unavailable for this source.]`
}

/**
 * Split raw paper text into logical sections using Gemini.
 * Max 10 sections to keep context manageable.
 */
export async function sectionPaper(text: string): Promise<PaperSection[]> {
  const system = `You are a research paper segmenter. Your goal is to split a long research paper text into logical sections. Return only valid JSON.`
  const prompt = `Text (truncated to 15k chars):
"${text.slice(0, 15000)}"

Split the text into logical sections (e.g., Abstract, Introduction, Background, Methodology, Results, Discussion, Conclusion).
Return a JSON array of objects: [{"title": "Section Title", "content": "Full section text content"}]
Keep the content verbatim from the input. Do not summarize. If a section is very long, keep the most important parts.`

  const responseText = await callGemini(prompt, system, 0, true)
  return safeParseJson<PaperSection[]>(responseText, [
    { title: 'Full Text', content: text.slice(0, 10000) }
  ])
}

/**
 * Generate an AI response for the reading assistant.
 * Uses the specific paper context and previous messages.
 */
export async function chatWithPaper(
  sessionId: string,
  userMessage: string
): Promise<string> {
  const session = await (prisma as any).paperReadingSession.findUnique({
    where: { id: sessionId },
    include: { 
      messages: { orderBy: { createdAt: 'desc' }, take: 6 } 
    }
  })

  if (!session) throw new Error('Session not found')

  const sections = session.sections as unknown as PaperSection[]
  const sectionContext = sections.map(s => `## ${s.title}\n${s.content.slice(0, 1500)}`).join('\n\n')
  
  const history = session.messages
    .reverse()
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n')

  const system = `You are an expert research reading assistant. You are helping a user read a specific paper.
Use the provided sections of the paper to answer accurately. 
If the answer isn't in the provided text, say you don't know based on the current sections.
When referencing a finding, explicitly mention which section you found it in (e.g. "In the Methodology section...").
Be technical and precise.`

  const prompt = `Paper Context (Sections):
${sectionContext}

Recent Conversation:
${history}

USER: ${userMessage}
ASSISTANT:`

  // Use temperature 0.3 for a balance of precision and helpfulness
  return callGemini(prompt, system, 0.3, false)
}

/**
 * Generate a deep methodology breakdown.
 */
export async function getMethodologyBreakdown(sessionId: string): Promise<string> {
  const session = await (prisma as any).paperReadingSession.findUnique({
    where: { id: sessionId }
  })

  if (!session) throw new Error('Session not found')

  const sections = session.sections as unknown as PaperSection[]
  const methodologySection = sections.find(s => 
    /method|approach|experiment|model|architecture/i.test(s.title)
  ) || sections[0]

  const system = `You are a research methodology auditor. Break down the paper's approach into key technical pillars. Use markdown.`
  const prompt = `Paper Content:
Title: ${session.candidatePaperId ?? 'Unknown'}
Content: ${methodologySection.content.slice(0, 4000)}

Analyze the methodology and provide:
1. Study Type (e.g. Randomized controlled, benchmark, theoretical proof)
2. Primary Method/Architecture details
3. Data/Dataset used (if applicable)
4. Evaluation metrics used
5. Key assumptions or limitations stated by the authors.`

  return callGemini(prompt, system, 0, false)
}
