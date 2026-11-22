import type { ServerResponse } from 'node:http';
import { generateCosmicExplanation } from '../server/explainerService.js';
import {
  enforceMethod,
  isRateLimited,
  readJsonBody,
  sendJson,
  type ServerlessRequest,
} from '../server/vercelHttp.js';

export default async function handler(
  req: ServerlessRequest,
  res: ServerResponse
): Promise<void> {
  if (!enforceMethod(req, res, ['POST'])) {
    return;
  }

  if (isRateLimited(req, 'explainer', 20, 60_000)) {
    sendJson(res, 429, {
      error: 'Too many requests. Please wait a moment and try again.',
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await generateCosmicExplanation(body);
    sendJson(res, 200, result, 'no-store');
  } catch (error) {
    const err = error as Error & { status?: number };
    const status = typeof err.status === 'number' ? err.status : 500;
    const message = err.message || 'Cosmic Explainer encountered an upstream error.';
    console.error('[VercelAPI:/api/explainer] Error:', message);
    sendJson(res, status, { error: message });
  }
}
