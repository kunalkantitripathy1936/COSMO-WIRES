import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { BRAND } from '../src/config/brand.js';
import type { ExplainerMode, ExplainerRequest, ExplainerResponse } from '../src/types.js';

const DEFAULT_PRIMARY_MODEL = 'gemini-4-hydrogen';
const DEFAULT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_HISTORY_TURNS = 6;

const SYSTEM_INSTRUCTION = `You are COSMIC EXPLAINER, the scientific literacy assistant for ${BRAND.name}, an international digital science magazine covering space, astronomy, astrophysics, and cosmology.

Strict scientific integrity rules:
1. Be scientifically accurate, clear, and accessible without dumbing down core physics.
2. NEVER fabricate measurements, dates, spacecraft telemetry, paper authors, or unverified discoveries.
3. If an article excerpt is limited or scientific findings are preliminary, explicitly say so.
4. Keep responses concise (roughly 140 to 260 words unless a glossary needs short bullet definitions).
5. Structure your response cleanly using short paragraphs and simple bullet lines starting with "- " when helpful. Avoid raw HTML or excessive markdown decoration.`;

const ALLOWED_MODES = new Set<ExplainerMode>([
  'explain-simple',
  'summarize',
  'significance',
  'glossary',
  'qa',
]);

function resolveGeminiApiKey(): string {
  const raw =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    '';
  if (!raw || /^MY_|^YOUR_/i.test(raw) || raw === 'MY_GEMINI_API_KEY') {
    return '';
  }
  return raw;
}

export function isGeminiConfigured(): boolean {
  return Boolean(resolveGeminiApiKey());
}

export function getConfiguredGeminiModels(): { primary: string; fallbacks: string[] } {
  const primary =
    process.env.GEMINI_PRIMARY_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_PRIMARY_MODEL;

  const envFallbacks = (
    process.env.GEMINI_FALLBACK_MODELS ||
    process.env.GEMINI_FALLBACK_MODEL ||
    ''
  )
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  const fallbacks = Array.from(
    new Set(
      [...envFallbacks, DEFAULT_FALLBACK_MODEL, DEFAULT_PRIMARY_MODEL].filter(
        (m) => m && m !== primary
      )
    )
  );

  return { primary, fallbacks };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    const isVercel = Boolean(process.env.VERCEL);
    const err = new Error(
      isVercel
        ? 'Cosmic Explainer is not configured on this deployment yet. Add GEMINI_API_KEY in Vercel Project Settings > Environment Variables and redeploy.'
        : 'GEMINI_API_KEY is not configured on the server. Add your key in Settings > Secrets to enable Cosmic Explainer.'
    );
    (err as Error & { status?: number }).status = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatConversationHistory(history?: ExplainerRequest['history']): string {
  if (!Array.isArray(history) || history.length === 0) return '';
  const sanitized = history
    .filter(
      (turn): turn is { role: 'user' | 'model'; text: string } =>
        Boolean(turn) &&
        (turn.role === 'user' || turn.role === 'model') &&
        typeof turn.text === 'string' &&
        turn.text.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => {
      const label = turn.role === 'user' ? 'Reader' : 'Cosmic Explainer';
      return `${label}: ${turn.text.trim().slice(0, 600)}`;
    });

  if (sanitized.length === 0) return '';
  return `Recent Conversation Context:\n${sanitized.join('\n')}`;
}

function buildPrompt(payload: ExplainerRequest): string {
  const articleContext = payload.article
    ? `Selected Article Context:
Title: ${String(payload.article.title ?? '').slice(0, 240)}
Publisher: ${String(payload.article.publisher ?? '').slice(0, 80)}
Category: ${String(payload.article.category ?? '').slice(0, 60)}
Published: ${String(payload.article.publishedAt ?? '').slice(0, 40)}
Available Excerpt: ${String(payload.article.excerpt ?? '').slice(0, 900)}`
    : '';

  const conversationContext = formatConversationHistory(payload.history);
  const preamble = [articleContext, conversationContext].filter(Boolean).join('\n\n');

  switch (payload.mode) {
    case 'explain-simple':
      return `${preamble}\n\nTask: Explain this space science topic or discovery in plain, intuitive language for an intelligent general reader. Stick strictly to established physics and what is stated in the excerpt.`;
    case 'summarize':
      return `${preamble}\n\nTask: Provide a concise 3-to-4 bullet scientific briefing summarizing only the key facts available in the excerpt, and note what a reader would find in the full original article.`;
    case 'significance':
      return `${preamble}\n\nTask: Explain why this discovery, mission, or scientific development matters in the broader context of modern astronomy, astrophysics, or space exploration.`;
    case 'glossary':
      return `${preamble}\n\nTask: Identify 4 to 5 key astronomy or astrophysics terms relevant to this topic and define each clearly in one or two accurate sentences.`;
    case 'qa': {
      const q = (payload.question ?? '').trim().slice(0, 500);
      return `${preamble ? `${preamble}\n\n` : ''}Reader Question: ${q}\n\nTask: Answer the reader's question with scientific rigor and clarity. If the question asks about details not contained in the excerpt or not established science, state that clearly.`;
    }
  }
}

function extractGeminiErrorInfo(error: unknown): { status: number; message: string } {
  const rawMessage = error instanceof Error ? error.message : String(error);
  let status = (error as { status?: number })?.status ?? 500;
  let message = rawMessage;

  try {
    const parsed = JSON.parse(rawMessage) as {
      error?: { code?: number; message?: string; status?: string };
    };
    if (parsed?.error?.message) {
      message = parsed.error.message;
      if (typeof parsed.error.code === 'number') {
        status = parsed.error.code;
      }
    }
  } catch {
    // Keep original message if not JSON
  }

  return { status, message };
}

function isPermanentAuthOrInputError(status: number, message: string): boolean {
  if (
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(message)
  ) {
    return true;
  }
  if (
    status === 400 &&
    !/thinkingConfig|thinking_level|not supported/i.test(message)
  ) {
    return true;
  }
  return false;
}

function isRetryableTransientError(status: number, message: string): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED|ETIMEDOUT|ECONNRESET|timed out/i.test(
      message
    )
  );
}

function isModelOrConfigFallbackError(status: number, message: string): boolean {
  return (
    status === 404 ||
    /NOT_FOUND|is not found for API version|thinkingConfig|thinking_level|not supported/i.test(
      message
    )
  );
}

function formatReadableGeminiError(error: unknown): { status: number; message: string } {
  const { status, message } = extractGeminiErrorInfo(error);

  if (
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(message)
  ) {
    return {
      status: 403,
      message: process.env.VERCEL
        ? 'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Vercel Environment Variables.'
        : 'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 404 || /NOT_FOUND|is not found for API version/i.test(message)) {
    return {
      status: 502,
      message:
        'The configured Gemini model is unavailable for this API key. Set a supported GEMINI_PRIMARY_MODEL or GEMINI_FALLBACK_MODEL in server environment variables.',
    };
  }
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) {
    return {
      status: 429,
      message: 'Cosmic Explainer rate limit reached across available models. Please wait a moment and try again.',
    };
  }
  if (
    status === 503 ||
    status === 504 ||
    status === 500 ||
    /UNAVAILABLE|high demand|overloaded|timed out/i.test(message)
  ) {
    return {
      status: 503,
      message:
        'Gemini models are temporarily experiencing high demand. We automatically tried our fallback model as well — please retry in a few seconds.',
    };
  }
  return { status, message };
}

interface ModelAttempt {
  model: string;
  thinkingLevel?: ThinkingLevel;
}

function thinkingLevelForModel(model: string): ThinkingLevel | undefined {
  if (model === 'gemini-4-hydrogen') return ThinkingLevel.LOW;
  if (model === 'gemini-3.1-flash-lite') return ThinkingLevel.MINIMAL;
  return undefined;
}

function buildModelAttempts(): ModelAttempt[] {
  const { primary, fallbacks } = getConfiguredGeminiModels();
  const attempts: ModelAttempt[] = [
    { model: primary, thinkingLevel: thinkingLevelForModel(primary) },
  ];

  for (const fallback of fallbacks) {
    attempts.push({ model: fallback, thinkingLevel: thinkingLevelForModel(fallback) });
  }

  // Final bounded retry on the fastest fallback without thinkingConfig (or primary if no fallback)
  const retryModel = fallbacks[0] || primary;
  attempts.push({ model: retryModel });

  return attempts;
}

function computeExponentialBackoffMs(attemptIndex: number): number {
  const baseMs = 600 * Math.pow(2, attemptIndex);
  const jitterMs = Math.floor(Math.random() * 250);
  return Math.min(3000, baseMs + jitterMs);
}

async function generateWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            Object.assign(new Error(`Gemini request timed out after ${timeoutMs}ms.`), {
              status: 504,
            })
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export async function generateCosmicExplanation(
  rawBody: unknown
): Promise<ExplainerResponse> {
  if (!rawBody || typeof rawBody !== 'object') {
    throw Object.assign(new Error('Invalid request body.'), { status: 400 });
  }

  const body = rawBody as Partial<ExplainerRequest>;
  const mode = body.mode;
  if (!mode || !ALLOWED_MODES.has(mode)) {
    throw Object.assign(new Error('Unsupported Cosmic Explainer mode.'), { status: 400 });
  }

  if (mode === 'qa') {
    if (typeof body.question !== 'string' || body.question.trim().length < 3) {
      throw Object.assign(new Error('Please enter a question of at least 3 characters.'), {
        status: 400,
      });
    }
  } else if (!body.article || typeof body.article.title !== 'string' || !body.article.title.trim()) {
    throw Object.assign(new Error('Please select an article or ask a direct question.'), {
      status: 400,
    });
  }

  const ai = getGeminiClient();
  const prompt = buildPrompt({
    mode,
    question: body.question,
    history: body.history,
    article: body.article,
  });

  const attempts = buildModelAttempts();
  let lastError: unknown = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const startedAt = Date.now();
    try {
      const response = await generateWithTimeout(
        ai.models.generateContent({
          model: attempt.model,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            ...(attempt.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
              : {}),
          },
        }),
        REQUEST_TIMEOUT_MS
      );

      const text = response.text?.trim();
      if (!text) {
        throw Object.assign(
          new Error('Cosmic Explainer returned an empty response. Please try again.'),
          { status: 502 }
        );
      }

      return {
        answer: text,
        mode,
        model: attempt.model,
        generatedAt: new Date().toISOString(),
        disclaimer:
          'AI-generated scientific explanation by COSMIC EXPLAINER. Verify primary measurements against the original publisher link.',
      };
    } catch (error) {
      lastError = error;
      const elapsedMs = Date.now() - startedAt;
      const errInfo = extractGeminiErrorInfo(error);
      console.error(
        `[CosmicExplainer] Attempt ${i + 1}/${attempts.length} failed (model=${attempt.model}, status=${errInfo.status}, elapsed=${elapsedMs}ms): ${errInfo.message}`
      );

      if (isPermanentAuthOrInputError(errInfo.status, errInfo.message)) {
        break;
      }

      const canContinue =
        i < attempts.length - 1 &&
        (isRetryableTransientError(errInfo.status, errInfo.message) ||
          isModelOrConfigFallbackError(errInfo.status, errInfo.message));

      if (canContinue) {
        if (isRetryableTransientError(errInfo.status, errInfo.message)) {
          const delayMs = computeExponentialBackoffMs(i);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        continue;
      }
      break;
    }
  }

  const formatted = formatReadableGeminiError(lastError);
  throw Object.assign(new Error(formatted.message), { status: formatted.status });
}
