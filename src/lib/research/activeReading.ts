import * as cheerio from 'cheerio'
import prisma from '@/lib/prisma'
import { callGemini, safeParseJson } from './geminiResearch'
import { Prisma } from '@prisma/client'

export interface PaperSection {
  title: string
  content: string
}

function extractArxivId(input: string): string | null {
  const trimmed = input.trim()
  const match = trimmed.match(/^\d{4}\.\d{4,5}(?:v\d+)?$/i)
  if (!match) return null

  return trimmed.replace(/v\d+$/i, '')
}

async function fetchArxivTextById(arxivId: string): Promise<string | null> {
  try {
    const ar5ivUrl = `https://ar5iv.org/abs/${arxivId}`
    const response = await fetch(ar5ivUrl)
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    $('script, style, nav, .ltx_page_footer, .ltx_page_header, .ltx_role_navigation').remove()

    let mainContent =
      $('.ltx_page_main').text() ||
      $('.ltx_document').text() ||
      $('article').text() ||
      $('.ltx_para').map((_, el) => $(el).text()).get().join('\n\n') ||
      $('body').text()

    mainContent = mainContent.replace(/\s+/g, ' ').trim()

    if (mainContent.length > 1000) {
      console.log(`[activeReading] Successfully extracted ${mainContent.length} chars from ar5iv for ${arxivId}`)
      return mainContent
    }

    console.log(`[activeReading] ar5iv content too short (${mainContent.length} chars) for ${arxivId}`)
    return null
  } catch (err) {
    console.error(`[activeReading] Failed to fetch ar5iv for ${arxivId}:`, err)
    return null
  }
}

/**
 * Fetch paper content from external sources (primarily ar5iv for arXiv).
 */
export async function fetchPaperContent(candidatePaperId: string): Promise<string> {
  const normalizedPaperRef = candidatePaperId.trim()

  const paper = await (prisma as any).candidatePaper.findFirst({
    where: {
      OR: [
        { id: normalizedPaperRef },
        { arxivId: normalizedPaperRef },
        { doi: normalizedPaperRef },
      ]
    },
    select: { arxivId: true, url: true, title: true, abstract: true }
  })

  if (!paper) {
    const directArxivId = extractArxivId(normalizedPaperRef)
    if (directArxivId) {
      const arxivText = await fetchArxivTextById(directArxivId)
      if (arxivText) return arxivText

      throw new Error(`Paper not found or inaccessible for arXiv ID: ${directArxivId}`)
    }

    throw new Error(`Paper not found in database: ${candidatePaperId}`)
  }

  // ArXiv papers are best fetched via ar5iv.org (HTML version)
  if (paper.arxivId) {
    const arxivText = await fetchArxivTextById(paper.arxivId)
    if (arxivText) {
      return arxivText
    }
  }

  // Try fetching from URL if available
  if (paper.url) {
    try {
      const response = await fetch(paper.url)
      if (response.ok) {
        const html = await response.text()
        const $ = cheerio.load(html)

        $('script, style, nav, footer, header').remove()

        let mainContent =
          $('article').text() ||
          $('.abstract').text() ||
          $('main').text() ||
          $('body').text()

        mainContent = mainContent.replace(/\s+/g, ' ').trim()

        if (mainContent.length > 1000) {
          console.log(`[activeReading] Successfully extracted ${mainContent.length} chars from URL for ${paper.title}`)
          return mainContent
        }
      }
    } catch (err) {
      console.error(`[activeReading] Failed to fetch from URL for ${paper.title}:`, err)
    }
  }

  // Fallback to abstract if full text fails or isn't available
  console.log(`[activeReading] Using abstract fallback for ${paper.title}`)
  return `Title: ${paper.title}\n\nAbstract: ${paper.abstract}\n\n[Full text extraction failed or unavailable for this source. Only abstract is available.]`
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

  const system = `Act as a research reading buddy that helps me deeply understand academic papers and think clearly about them. Your goal is to turn dense research into structured understanding that I can retain and use, not just summarize text. When given a paper, first identify its core problem in simple terms, then explain why that problem matters in its field. Break the paper into clear components: problem setup, key idea or method, technical approach, experiments or evaluation, results, and limitations. For each part, explain both what it is and why it is structured that way in the context of the paper's goal. Prioritize intuition and mental models over surface-level restatement. When technical concepts appear, explain them step-by-step using simple building blocks, and connect them to familiar ideas when possible. If equations, algorithms, or architectures are present, describe their role in the system and how they contribute to the final result, rather than focusing on full derivations unless explicitly requested.

Always extract and clearly state the paper's main contribution in one or two sentences. Then go one level deeper and explain what is actually new compared to prior work, including what assumption it challenges or improves. When discussing results, interpret what the numbers or findings mean in practical terms and what conclusions can and cannot be drawn. Explicitly highlight limitations, failure cases, or constraints the authors acknowledge or imply.

When I ask questions, respond directly using only the paper content and logically grounded reasoning. If a concept is unclear, break it down further instead of repeating the same explanation. If I ask for comparisons between papers, structure the comparison across key dimensions such as problem framing, method, data or assumptions, and performance outcomes. Always emphasize differences in design choices and what trade-offs those choices create.

Maintain a structured, readable format with clear sections and short paragraphs. Avoid unnecessary verbosity, but do not oversimplify to the point of losing technical meaning. Your job is to act like a patient expert who helps me build a correct mental model of the work, step by step, until I can explain it back myself.`

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
