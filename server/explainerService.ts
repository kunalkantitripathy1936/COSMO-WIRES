import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { BRAND } from '../src/config/brand.js';
import type { ExplainerMode, ExplainerRequest, ExplainerResponse } from '../src/types.js';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const BACKUP_MODEL = 'gemini-3.1-flash-lite';

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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured on the server. Add your key in Settings > Secrets to enable Cosmic Explainer.'
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

function buildPrompt(payload: ExplainerRequest): string {
  const articleContext = payload.article
    ? `Selected Article Context:
Title: ${payload.article.title.slice(0, 240)}
Publisher: ${payload.article.publisher.slice(0, 80)}
Category: ${payload.article.category.slice(0, 60)}
Published: ${payload.article.publishedAt.slice(0, 40)}
Available Excerpt: ${payload.article.excerpt.slice(0, 900)}`
    : '';

  switch (payload.mode) {
    case 'explain-simple':
      return `${articleContext}\n\nTask: Explain this space science topic or discovery in plain, intuitive language for an intelligent general reader. Stick strictly to established physics and what is stated in the excerpt.`;
    case 'summarize':
      return `${articleContext}\n\nTask: Provide a concise 3-to-4 bullet scientific briefing summarizing only the key facts available in the excerpt, and note what a reader would find in the full original article.`;
    case 'significance':
      return `${articleContext}\n\nTask: Explain why this discovery, mission, or scientific development matters in the broader context of modern astronomy, astrophysics, or space exploration.`;
    case 'glossary':
      return `${articleContext}\n\nTask: Identify 4 to 5 key astronomy or astrophysics terms relevant to this topic and define each clearly in one or two accurate sentences.`;
    case 'qa': {
      const q = (payload.question ?? '').trim().slice(0, 500);
      return `${articleContext ? `${articleContext}\n\n` : ''}Reader Question: ${q}\n\nTask: Answer the reader's question with scientific rigor and clarity. If the question asks about details not contained in the excerpt or not established science, state that clearly.`;
    }
  }
}

function formatReadableGeminiError(error: unknown): { status: number; message: string } {
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

  if (status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return {
      status: 403,
      message:
        'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) {
    return {
      status: 429,
      message: 'Cosmic Explainer rate limit reached. Please wait a moment and try again.',
    };
  }
  if (status === 503 || /UNAVAILABLE|high demand/i.test(message)) {
    return {
      status: 503,
      message:
        'The Gemini science model is temporarily experiencing high demand. Please retry in a few seconds.',
    };
  }
  return { status, message };
}

function isTransientError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;
  return status === 503 || status === 429 || /503|UNAVAILABLE|high demand/i.test(msg);
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
    article: body.article,
  });

  const attempts: Array<{ model: string; thinkingLevel?: ThinkingLevel }> = [
    { model: PRIMARY_MODEL, thinkingLevel: ThinkingLevel.LOW },
    { model: BACKUP_MODEL, thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  let lastError: unknown = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          ...(attempt.thinkingLevel
            ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
            : {}),
        },
      });

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
      if (i < attempts.length - 1 && isTransientError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      break;
    }
  }

  const formatted = formatReadableGeminiError(lastError);
  throw Object.assign(new Error(formatted.message), { status: formatted.status });
}
