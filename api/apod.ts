import type { ServerResponse } from 'node:http';
import { getNasaApod } from '../server/apodService.js';
import {
  enforceMethod,
  getSearchParams,
  sendJson,
  type ServerlessRequest,
} from '../server/vercelHttp.js';

export default async function handler(
  req: ServerlessRequest,
  res: ServerResponse
): Promise<void> {
  if (!enforceMethod(req, res, ['GET'])) {
    return;
  }

  try {
    const params = getSearchParams(req);
    const dateParam = params.get('date') || undefined;
    const apod = await getNasaApod(dateParam);
    sendJson(
      res,
      200,
      apod,
      'public, max-age=300, s-maxage=3600, stale-while-revalidate=600'
    );
  } catch (error) {
    console.error('[VercelAPI:/api/apod] Failed to serve NASA APOD:', error);
    sendJson(res, 500, {
      error: 'Unable to load NASA Astronomy Picture of the Day.',
    });
  }
}
