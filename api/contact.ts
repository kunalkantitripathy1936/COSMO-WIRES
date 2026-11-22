import type { ServerResponse } from 'node:http';
import { EmailDeliveryError } from '../server/emailService.js';
import { ContactRequestError, submitContactInquiry } from '../server/storageService.js';
import {
  enforceMethod,
  isRateLimited,
  readJsonBody,
  sendJson,
  type ServerlessRequest,
} from '../server/vercelHttp.js';
import { CONTACT_ERROR_MESSAGE } from '../src/utils/contactLogic.js';

export default async function handler(
  req: ServerlessRequest,
  res: ServerResponse
): Promise<void> {
  if (!enforceMethod(req, res, ['POST'])) {
    return;
  }

  if (isRateLimited(req, 'contact', 5, 60_000)) {
    sendJson(res, 429, {
      error: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await submitContactInquiry(body);
    sendJson(res, 201, result, 'no-store');
  } catch (error) {
    if (error instanceof ContactRequestError) {
      sendJson(res, error.status, {
        error: error.message,
        code: error.code,
        fieldErrors: error.fieldErrors,
      });
      return;
    }

    if (error instanceof EmailDeliveryError) {
      console.error('[VercelAPI:/api/contact] Email delivery failure:', error.code, error.message);
      sendJson(res, error.status, {
        error: error.message,
        code: error.code,
      });
      return;
    }

    const err = error as Error & { status?: number };
    if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
      sendJson(res, err.status, {
        error: err.message,
        code: 'INVALID_REQUEST',
      });
      return;
    }

    console.error('[VercelAPI:/api/contact] Unexpected error:', error);
    sendJson(res, 500, {
      error: CONTACT_ERROR_MESSAGE,
      code: 'INTERNAL_ERROR',
    });
  }
}
