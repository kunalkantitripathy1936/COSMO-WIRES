/**
 * Frontend API URL resolution and JSON response guards.
 *
 * By default (`VITE_API_BASE_URL` unset), all requests target same-origin `/api/*`
 * routes served by Vercel Serverless Functions in production or Express in local dev.
 * Set `VITE_API_BASE_URL` only if hosting the API on a separate external origin.
 */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== 'string') {
    return '';
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'MY_API_BASE_URL') {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

export function apiUrl(endpointPath: string): string {
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function parseJsonResponse<T>(
  response: Response,
  contextLabel: string
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      `${contextLabel} returned non-JSON response (HTTP ${response.status}).`
    );
  }
  return (await response.json()) as T;
}
