export const GEMINI_PRICING = {
  'gemini-2.5-flash': {
    inputPricePerMillion: 0.30,
    outputPricePerMillion: 2.50,
    currency: 'USD',
  },
  'text-embedding-004': {
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
    currency: 'USD',
  },
  'embedding-001': {
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
    currency: 'USD',
  },
  'gemini-embedding-001': {
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
    currency: 'USD',
  },
} as const;

export const FEATURE_LABELS: Record<string, string> = {
  keyword_extraction: 'Keyword Extraction',
  topic_assignment: 'Topic Assignment',
  cluster_labeling: 'Cluster Labeling',
  paper_summarization: 'Paper Summarization',
  paper_overview: 'Paper Overview',
  paper_sections: 'Paper Sections',
  why_explanation: 'Why This Paper',
  relevance_check: 'Alert Relevance Check',
  emerging_trends: 'Emerging Trends',
  metadata_extraction: 'Metadata Extraction',
  qa_response: 'Reading Assistant Q&A',
  section_summary: 'Section Summary',
  section_explanation: 'Section Explanation',
  method_breakdown: 'Method Breakdown',
  experiment_interpretation: 'Experiment Interpretation',
  paper_comparison: 'Paper Comparison',
  bibliography_related_work: 'Bibliography Related Work',
  url_metadata_extraction: 'URL Metadata Extraction',
  rss_relevance_check: 'RSS Relevance Check',
  other: 'Other',
} as const;

export type GeminiPricedModel = keyof typeof GEMINI_PRICING;
export type GeminiFeatureKey = keyof typeof FEATURE_LABELS;

function getPricing(model: string) {
  const pricing = GEMINI_PRICING[model as GeminiPricedModel];
  if (!pricing) {
    console.warn(`[GEMINI PRICING WARNING] Missing pricing for model=${model}. Defaulting costs to $0.00.`);
    return {
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
      currency: 'USD',
    };
  }
  return pricing;
}

export function computeCost(model: string, inputTokens: number, outputTokens: number) {
  const pricing = getPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export function formatCost(usdAmount: number) {
  if (usdAmount <= 0) {
    return '$0.0000';
  }

  if (usdAmount < 0.0001) {
    return '$0.0001';
  }

  if (usdAmount < 0.01) {
    return `$${usdAmount.toFixed(4)}`;
  }

  if (usdAmount < 1) {
    return `$${usdAmount.toFixed(3)}`;
  }

  return `$${usdAmount.toFixed(2)}`;
}
