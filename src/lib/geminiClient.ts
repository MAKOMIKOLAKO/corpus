import 'server-only';
import { prisma, withRetry } from '@/lib/prismaWithRetry';
import { computeCost } from '@/lib/geminiPricing';

const prismaDynamic = prisma as typeof prisma & {
  geminiApiCall: {
    create: (args: unknown) => Promise<unknown>;
  };
};

type GeminiGenerateRequest = {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  feature: string;
  userId?: string | null;
  responseMimeType?: string;
};

type GeminiEmbeddingRequest = {
  model: string;
  text: string;
  feature: string;
  userId?: string | null;
};

type GeminiBatchEmbeddingRequest = {
  model: string;
  texts: string[];
  feature: string;
  userId?: string | null;
};

type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is required');
  }
  return key;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function extractUsage(usageMetadata: UsageMetadata | undefined, promptText: string, outputText: string) {
  const estimated = !usageMetadata;
  const inputTokens = usageMetadata?.promptTokenCount ?? estimateTokens(promptText);
  const outputTokens = usageMetadata?.candidatesTokenCount ?? estimateTokens(outputText);
  const totalTokens = usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimated,
  };
}

function logGeminiCall(params: {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  durationMs: number | null;
  userId?: string | null;
  success: boolean;
  estimated?: boolean;
}) {
  const estimatedSuffix = params.estimated ? ' estimatedTokens=true' : '';
  console.log(
    `[GEMINI] feature=${params.feature} model=${params.model} inputTokens=${params.inputTokens} outputTokens=${params.outputTokens} cost=$${params.totalCost.toFixed(6)} duration=${params.durationMs ?? 0}ms userId=${params.userId ?? 'CRON'} success=${params.success}${estimatedSuffix}`
  );
}

function logGeminiError(params: { feature: string; model: string; error: string; userId?: string | null }) {
  console.error(
    `[GEMINI ERROR] feature=${params.feature} model=${params.model} error=${params.error} userId=${params.userId ?? 'CRON'}`
  );
}

function recordGeminiApiCall(payload: {
  userId?: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  success: boolean;
  errorMessage?: string | null;
  durationMs?: number | null;
}) {
  withRetry(() =>
    prismaDynamic.geminiApiCall.create({
      data: {
        userId: payload.userId ?? null,
        feature: payload.feature,
        model: payload.model,
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        totalTokens: payload.totalTokens,
        inputCost: payload.inputCost,
        outputCost: payload.outputCost,
        totalCost: payload.totalCost,
        success: payload.success,
        errorMessage: payload.errorMessage ?? null,
        durationMs: payload.durationMs ?? null,
      },
    })
  ).catch((error) => {
    console.error('[geminiClient] Failed to record GeminiApiCall', error);
  });
}

export async function callGemini({
  model,
  prompt,
  systemPrompt,
  temperature = 0,
  maxOutputTokens,
  feature,
  userId,
  responseMimeType,
}: GeminiGenerateRequest): Promise<string> {
  const startedAt = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getGeminiApiKey()}`;
  const requestBody: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      ...(typeof maxOutputTokens === 'number' ? { maxOutputTokens } : {}),
      ...(responseMimeType ? { response_mime_type: responseMimeType } : {}),
    },
  };

  if (systemPrompt) {
    requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorMessage = await response.text();
      recordGeminiApiCall({
        userId,
        feature,
        model,
        inputTokens: estimateTokens(`${systemPrompt ?? ''}\n${prompt}`),
        outputTokens: 0,
        totalTokens: estimateTokens(`${systemPrompt ?? ''}\n${prompt}`),
        inputCost: computeCost(model, estimateTokens(`${systemPrompt ?? ''}\n${prompt}`), 0).inputCost,
        outputCost: 0,
        totalCost: computeCost(model, estimateTokens(`${systemPrompt ?? ''}\n${prompt}`), 0).totalCost,
        success: false,
        errorMessage,
        durationMs,
      });
      logGeminiError({ feature, model, error: errorMessage, userId });
      throw new Error(`Gemini API error ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      const errorMessage = 'Gemini returned empty response';
      recordGeminiApiCall({
        userId,
        feature,
        model,
        inputTokens: estimateTokens(`${systemPrompt ?? ''}\n${prompt}`),
        outputTokens: 0,
        totalTokens: estimateTokens(`${systemPrompt ?? ''}\n${prompt}`),
        inputCost: computeCost(model, estimateTokens(`${systemPrompt ?? ''}\n${prompt}`), 0).inputCost,
        outputCost: 0,
        totalCost: computeCost(model, estimateTokens(`${systemPrompt ?? ''}\n${prompt}`), 0).totalCost,
        success: false,
        errorMessage,
        durationMs,
      });
      logGeminiError({ feature, model, error: errorMessage, userId });
      throw new Error(errorMessage);
    }

    const usage = extractUsage(data?.usageMetadata, `${systemPrompt ?? ''}\n${prompt}`, text);
    const cost = computeCost(model, usage.inputTokens, usage.outputTokens);
    recordGeminiApiCall({
      userId,
      feature,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
      success: true,
      durationMs,
    });
    logGeminiCall({
      feature,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalCost: cost.totalCost,
      durationMs,
      userId,
      success: true,
      estimated: usage.estimated,
    });

    return text.trim();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Gemini API error')) {
      throw error;
    }

    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini error';
    const estimatedInputTokens = estimateTokens(`${systemPrompt ?? ''}\n${prompt}`);
    const cost = computeCost(model, estimatedInputTokens, 0);
    recordGeminiApiCall({
      userId,
      feature,
      model,
      inputTokens: estimatedInputTokens,
      outputTokens: 0,
      totalTokens: estimatedInputTokens,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
      success: false,
      errorMessage,
      durationMs,
    });
    logGeminiError({ feature, model, error: errorMessage, userId });
    throw error;
  }
}

export async function callGeminiEmbedding({ model, text, feature, userId }: GeminiEmbeddingRequest): Promise<number[]> {
  const startedAt = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${getGeminiApiKey()}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorMessage = await response.text();
      const inputTokens = estimateTokens(text);
      const cost = computeCost(model, inputTokens, 0);
      recordGeminiApiCall({
        userId,
        feature,
        model,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        inputCost: cost.inputCost,
        outputCost: cost.outputCost,
        totalCost: cost.totalCost,
        success: false,
        errorMessage,
        durationMs,
      });
      logGeminiError({ feature, model, error: errorMessage, userId });
      throw new Error(`Gemini embedding error [${model}] ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    const values: number[] = data?.embedding?.values;
    if (!values || values.length === 0) {
      throw new Error(`Gemini returned empty embedding for model [${model}]`);
    }

    const usage = extractUsage(data?.usageMetadata, text, '');
    const cost = computeCost(model, usage.inputTokens, 0);
    recordGeminiApiCall({
      userId,
      feature,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: 0,
      totalTokens: usage.totalTokens || usage.inputTokens,
      inputCost: cost.inputCost,
      outputCost: 0,
      totalCost: cost.totalCost,
      success: true,
      durationMs,
    });
    logGeminiCall({
      feature,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: 0,
      totalCost: cost.totalCost,
      durationMs,
      userId,
      success: true,
      estimated: usage.estimated,
    });

    return values;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini embedding error';
    const inputTokens = estimateTokens(text);
    const cost = computeCost(model, inputTokens, 0);
    recordGeminiApiCall({
      userId,
      feature,
      model,
      inputTokens,
      outputTokens: 0,
      totalTokens: inputTokens,
      inputCost: cost.inputCost,
      outputCost: 0,
      totalCost: cost.totalCost,
      success: false,
      errorMessage,
      durationMs,
    });
    logGeminiError({ feature, model, error: errorMessage, userId });
    throw error;
  }
}

export async function callGeminiBatchEmbeddings({ model, texts, feature, userId }: GeminiBatchEmbeddingRequest): Promise<number[][]> {
  const startedAt = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${getGeminiApiKey()}`;
  const truncatedTexts = texts.map((value) => value);
  const requests = truncatedTexts.map((value) => ({
    model: `models/${model}`,
    content: { parts: [{ text: value }] },
  }));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorMessage = await response.text();
      const inputTokens = truncatedTexts.reduce((sum, value) => sum + estimateTokens(value), 0);
      const cost = computeCost(model, inputTokens, 0);
      recordGeminiApiCall({
        userId,
        feature,
        model,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        inputCost: cost.inputCost,
        outputCost: 0,
        totalCost: cost.totalCost,
        success: false,
        errorMessage,
        durationMs,
      });
      logGeminiError({ feature, model, error: errorMessage, userId });
      throw new Error(`Gemini batch embedding error [${model}] ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    const embeddings: Array<{ values: number[] }> = data?.embeddings ?? [];
    if (embeddings.length !== texts.length) {
      throw new Error(`Embedding count mismatch for [${model}]: expected ${texts.length}, got ${embeddings.length}`);
    }

    const promptText = truncatedTexts.join('\n');
    const usage = extractUsage(data?.usageMetadata, promptText, '');
    const fallbackInputTokens = truncatedTexts.reduce((sum, value) => sum + estimateTokens(value), 0);
    const inputTokens = usage.estimated ? fallbackInputTokens : usage.inputTokens;
    const totalTokens = usage.estimated ? fallbackInputTokens : usage.totalTokens;
    const cost = computeCost(model, inputTokens, 0);
    recordGeminiApiCall({
      userId,
      feature,
      model,
      inputTokens,
      outputTokens: 0,
      totalTokens,
      inputCost: cost.inputCost,
      outputCost: 0,
      totalCost: cost.totalCost,
      success: true,
      durationMs,
    });
    logGeminiCall({
      feature,
      model,
      inputTokens,
      outputTokens: 0,
      totalCost: cost.totalCost,
      durationMs,
      userId,
      success: true,
      estimated: usage.estimated,
    });

    return embeddings.map((embedding) => embedding.values);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini batch embedding error';
    const inputTokens = truncatedTexts.reduce((sum, value) => sum + estimateTokens(value), 0);
    const cost = computeCost(model, inputTokens, 0);
    recordGeminiApiCall({
      userId,
      feature,
      model,
      inputTokens,
      outputTokens: 0,
      totalTokens: inputTokens,
      inputCost: cost.inputCost,
      outputCost: 0,
      totalCost: cost.totalCost,
      success: false,
      errorMessage,
      durationMs,
    });
    logGeminiError({ feature, model, error: errorMessage, userId });
    throw error;
  }
}
