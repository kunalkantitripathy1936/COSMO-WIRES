import type { ServerResponse } from 'node:http';
import { getContactEmailDiagnostics } from '../server/emailService.js';
import { isGeminiConfigured } from '../server/explainerService.js';
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

  const emailDiagnostics = getContactEmailDiagnostics();

  sendJson(
    res,
    200,
    {
      status: 'ok',
      service: BRAND.serviceId,
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-serverless',
      timestamp: new Date().toISOString(),
      news: getNewsHealthSummary(),
      explainerConfigured: isGeminiConfigured(),
      contactEmailConfigured: emailDiagnostics.configured,
      contactEmailProvider: emailDiagnostics.provider,
      contactMissingEnvVars: emailDiagnostics.missingRequired,
      contactConfigIssues: emailDiagnostics.issues,
    },
    'no-store'
  );
}
