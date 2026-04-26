/**
 * All Gemini LLM calls specific to the Research Reading System.
 * Temperature settings, prompts, and output formats per spec PART 6.
 */

import { callGemini as callGeminiClient } from '@/lib/geminiClient'

const GEMINI_MODEL = 'gemini-2.5-flash'

export async function callGemini(
  prompt: string,
  systemInstruction: string,
  temperature: number = 0,
  expectJson: boolean = true,
  options?: {
    feature?: string
    userId?: string | null
    model?: string
    maxOutputTokens?: number
  }
): Promise<string> {
  return callGeminiClient({
    model: options?.model ?? GEMINI_MODEL,
    prompt,
    systemPrompt: systemInstruction,
    temperature,
    maxOutputTokens: options?.maxOutputTokens,
    feature: options?.feature ?? 'other',
    userId: options?.userId ?? null,
    responseMimeType: expectJson ? 'application/json' : undefined,
  })
}

export function safeParseJson<T>(text: string, fallback: T): T {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    return JSON.parse(cleaned) as T
  } catch {
    console.error('[geminiResearch] JSON parse failed:', text.slice(0, 200))
    return fallback
  }
}

// ========== Module 2: Metadata Extraction ==========

export interface PaperMetadata {
  methodology: 'empirical' | 'theoretical' | 'survey' | 'benchmark' | 'replication'
  domainTags: string[]
  noveltyIndicators: string[]
  complexityScore: number
}

/**
 * Extract structured metadata from a paper's title and abstract.
 * Temperature: 0 (deterministic extraction).
 */
export async function extractMetadata(
  title: string,
  abstract: string,
  options?: { userId?: string | null }
): Promise<PaperMetadata> {
  const system = `You are a research paper metadata extractor. Return only valid JSON. Do not add any explanation.`
  const prompt = `Title: "${title}"
Abstract: "${abstract.slice(0, 2000)}"

Extract the following and return as JSON:
{
  "methodology": one of ["empirical", "theoretical", "survey", "benchmark", "replication"],
  "domainTags": array of 3-5 specific academic subfield strings (be precise — prefer "Vision Transformers" over "Deep Learning"),
  "noveltyIndicators": array from ["new_dataset", "new_architecture", "new_theory", "new_benchmark", "replication", "meta_analysis", "interdisciplinary"],
  "complexityScore": integer 1-5 where 1=undergraduate accessible, 5=requires deep domain expertise
}`

  const text = await callGemini(prompt, system, 0, true, {
    feature: 'metadata_extraction',
    userId: options?.userId ?? null,
  })
  return safeParseJson<PaperMetadata>(text, {
    methodology: 'empirical',
    domainTags: [],
    noveltyIndicators: [],
    complexityScore: 3,
  })
}

// ========== Module 5: Cluster Labeling ==========

/**
 * Generate a 3-6 word thematic label for a cluster.
 * Input: titles and abstracts of 3 papers nearest to cluster centroid.
 * Temperature: 0 (deterministic).
 */
export async function labelCluster(
  papers: Array<{ title: string; abstract?: string | null }>,
  options?: { userId?: string | null }
): Promise<string> {
  const system = `You are a research topic labeler. Return only a JSON object with one field: label (string, 3-6 words max).`
  const paperList = papers
    .map((p, i) => `Paper ${i + 1}: "${p.title}"\n${p.abstract ? p.abstract.slice(0, 400) : ''}`)
    .join('\n\n')

  const prompt = `These research papers belong to the same thematic cluster:

${paperList}

Provide a concise thematic label that captures what these papers have in common. Be specific — not "Machine Learning" but "Efficient Transformer Attention Mechanisms".`

  const text = await callGemini(prompt, system, 0, true, {
    feature: 'cluster_labeling',
    userId: options?.userId ?? null,
  })
  const parsed = safeParseJson<{ label: string }>(text, { label: 'Research Papers' })
  return parsed.label || 'Research Papers'
}

// ========== Module 6: Summarization ==========

export interface PaperSummaries {
  plainSummary: string
  technicalSummary: string
  noveltyTag: string
}

const NOVELTY_TAGS = [
  'New method',
  'New dataset',
  'State-of-the-art result',
  'Survey',
  'Theoretical',
  'Replication',
  'Interdisciplinary',
]

/**
 * Generate user-agnostic plain and technical summaries for a paper.
 * Cached on CandidatePaper — computed once, reused across all users.
 * Temperature: 0.3.
 */
export async function generatePaperSummaries(paper: {
  title: string
  authors: string[]
  abstract?: string | null
  candidateMetadata?: PaperMetadata | null
}, options?: { userId?: string | null }): Promise<PaperSummaries> {
  const system = `You are a research summarizer writing for an intelligent non-specialist. Be precise. Do not oversimplify to the point of inaccuracy. Return only a JSON object.`
  const prompt = `Title: "${paper.title}"
Authors: ${paper.authors.slice(0, 5).join(', ')}
Abstract: "${(paper.abstract || '').slice(0, 2000)}"
${paper.candidateMetadata ? `Methodology: ${paper.candidateMetadata.methodology}, Domain: ${paper.candidateMetadata.domainTags.join(', ')}` : ''}

Return JSON:
{
  "plainSummary": "2-3 sentences explaining the paper's contribution to a smart reader outside the field",
  "technicalSummary": "1-2 sentences at expert level describing the method or finding precisely using correct terminology",
  "noveltyTag": one of ${JSON.stringify(NOVELTY_TAGS)}
}`

  const text = await callGemini(prompt, system, 0.3, true, {
    feature: 'paper_summarization',
    userId: options?.userId ?? null,
  })
  return safeParseJson<PaperSummaries>(text, {
    plainSummary: paper.abstract?.slice(0, 300) ?? '',
    technicalSummary: paper.abstract?.slice(0, 200) ?? '',
    noveltyTag: 'New method',
  })
}

/**
 * Generate user-specific "why this paper" explanation.
 * Never cached globally — always user-specific.
 * Temperature: 0.3.
 */
export async function generateWhyExplanation(
  paper: { title: string; abstract?: string | null; candidateMetadata?: PaperMetadata | null },
  userContext: {
    topDomains: string[] // top 5 domain tags by weight
    recentPaperTitles: string[] // last 5 saved paper titles
  },
  options?: { userId?: string | null }
): Promise<string> {
  const system = `You are a personalized research recommender. Return only a JSON object.`
  const prompt = `Paper title: "${paper.title}"
Abstract: "${(paper.abstract || '').slice(0, 800)}"
${paper.candidateMetadata ? `Domain tags: ${paper.candidateMetadata.domainTags.join(', ')}` : ''}

User's research interests (from their saved papers):
- Top domains: ${userContext.topDomains.join(', ')}
- Recently saved: ${userContext.recentPaperTitles.join(' | ')}

Return JSON:
{
  "whyExplanation": "1-2 sentences explaining specifically why this paper is relevant to this user's research interests. Reference specific aspects of their interests. Never be generic."
}`

  const text = await callGemini(prompt, system, 0.3, true, {
    feature: 'why_explanation',
    userId: options?.userId ?? null,
  })
  const parsed = safeParseJson<{ whyExplanation: string }>(text, {
    whyExplanation: 'This paper aligns with your research interests.',
  })
  return parsed.whyExplanation || 'This paper aligns with your research interests.'
}

/**
 * Generate emerging trends paragraph for a daily brief.
 * Plain text, not JSON. Temperature: 0.3.
 */
export async function generateEmergingTrends(
  clusterLabels: string[],
  paperTitles: string[],
  options?: { userId?: string | null }
): Promise<string> {
  const system = `You are a research landscape analyst. Return only plain text, no JSON.`
  const prompt = `Today's research themes (cluster labels): ${clusterLabels.join(', ')}

Selected papers in this feed:
${paperTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Write a 3-5 sentence paragraph describing what research directions appear to be active today based on this personalized feed. Focus on patterns and momentum, not individual papers.`

  return callGemini(prompt, system, 0.3, false, {
    feature: 'emerging_trends',
    userId: options?.userId ?? null,
  })
}
