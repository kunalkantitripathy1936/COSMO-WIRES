import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ServerlessRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function isRateLimited(
  req: IncomingMessage,
  scope: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const ip = getClientIp(req);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (bucket.count >= maxRequests) {
    return true;
  }
  bucket.count += 1;
  return false;
}

export function getSearchParams(req: ServerlessRequest): URLSearchParams {
  const host = req.headers.host || 'localhost';
  const rawUrl = req.url || '/';
  try {
    return new URL(rawUrl, `https://${host}`).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
  cacheControl = 'no-store'
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

export function applyCorsHeaders(req: IncomingMessage, res: ServerResponse, methods: string[]): void {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\//i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', `${methods.join(', ')}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

export function enforceMethod(
  req: IncomingMessage,
  res: ServerResponse,
  allowedMethods: string[]
): boolean {
  applyCorsHeaders(req, res, allowedMethods);
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }
  if (!allowedMethods.includes(method)) {
    res.setHeader('Allow', `${allowedMethods.join(', ')}, OPTIONS`);
    sendJson(res, 405, { error: `Method ${method} not allowed.` });
    return false;
  }
  return true;
}

export async function readJsonBody(req: ServerlessRequest, maxBytes = 64 * 1024): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return req.body.trim() ? JSON.parse(req.body) : {};
    }
    if (Buffer.isBuffer(req.body)) {
      const str = req.body.toString('utf-8').trim();
      return str ? JSON.parse(str) : {};
    }
    return req.body;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        reject(Object.assign(new Error('Request body exceeds size limit.'), { status: 413 }));
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON request payload.'), { status: 400 }));
      }
    });

    req.on('error', (err) => reject(err));
  });
}
