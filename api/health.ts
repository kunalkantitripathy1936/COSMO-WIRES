import type { ServerResponse } from 'node:http';
import { isEmailTransportConfigured } from '../server/emailService.js';
import { getNewsHealthSummary } from '../server/newsAggregator.js';
import {
  enforceMethod,
  sendJson,
  type ServerlessRequest,
} from '../server/vercelHttp.js';
import { BRAND } from '../src/config/brand.js';

export default function handler(
  req: ServerlessRequest,
  res: ServerResponse
): void {
  if (!enforceMethod(req, res, ['GET'])) {
    return;
  }

  sendJson(
    res,
    200,
    {
      status: 'ok',
      service: BRAND.serviceId,
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-serverless',
      timestamp: new Date().toISOString(),
      news: getNewsHealthSummary(),
      contactEmailConfigured: isEmailTransportConfigured(),
    },
    'no-store'
  );
}
