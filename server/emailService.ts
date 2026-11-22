import nodemailer, { type Transporter } from 'nodemailer';
import {
  CONTACT_ERROR_MESSAGE,
  CONTACT_RECIPIENT_EMAIL,
  type SanitizedContactData,
  buildContactEmailPayload,
  isValidEmailAddress,
  sanitizeHeaderValue,
} from '../src/utils/contactLogic.js';
import { BRAND } from '../src/config/brand.js';

export const CONTACT_SMTP_ENV_VARS = [
  'CONTACT_TO_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

export type ContactSmtpEnvVar = (typeof CONTACT_SMTP_ENV_VARS)[number];

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS?: boolean;
  user?: string;
  pass?: string;
  from: string;
  recipientEmail: string;
  ignoreTLS?: boolean;
}

export interface EmailDeliveryResult {
  delivered: true;
  provider: 'smtp' | 'resend';
  messageId: string;
  recipient: string;
}

export interface ContactEmailDiagnostics {
  configured: boolean;
  provider: 'smtp' | 'resend' | 'none';
  envPresence: Record<ContactSmtpEnvVar, boolean>;
  missingRequired: string[];
  issues: string[];
}

export class EmailDeliveryError extends Error {
  public readonly status: number;
  public readonly code: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_DELIVERY_FAILED';

  constructor(
    message: string,
    status: number,
    code: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_DELIVERY_FAILED'
  ) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Reads an environment variable, trimming whitespace and stripping a single pair
 * of matching surrounding single/double quotes (which commonly occurs when users
 * copy `.env.example` values verbatim into the Vercel Environment Variables UI).
 */
function getEnv(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== 'string') return '';
  let value = raw.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

const KNOWN_PLACEHOLDER_PATTERNS: RegExp[] = [
  /^YOUR_[A-Z0-9_]+$/i,
  /^MY_[A-Z0-9_]+$/i,
  /^REPLACE_WITH_[A-Z0-9_]+$/i,
  /^<[^>]+>$/,
  /^your-sender-account@gmail\.com$/i,
  /^re_your_api_key$/i,
  /^changeme$/i,
  /^placeholder$/i,
];

function isPlaceholderCredential(value: string): boolean {
  if (!value) return true;
  return KNOWN_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function isGmailHost(host: string): boolean {
  return /(^|\.)(gmail|googlemail)\.com$/i.test(host);
}

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function parseBooleanFlag(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return null;
}

function maskEmailForLogs(email?: string): string {
  if (!email) return 'unset';
  const atIndex = email.indexOf('@');
  if (atIndex <= 1) return '***';
  return `${email.slice(0, 2)}***${email.slice(atIndex)}`;
}

export function getContactRecipientEmail(): string {
  const configured = sanitizeHeaderValue(getEnv('CONTACT_TO_EMAIL')).toLowerCase();
  if (!configured) {
    return CONTACT_RECIPIENT_EMAIL;
  }
  if (!isValidEmailAddress(configured)) {
    console.warn(
      `[ContactEmail] CONTACT_TO_EMAIL is not a valid email address; falling back to ${CONTACT_RECIPIENT_EMAIL}.`
    );
    return CONTACT_RECIPIENT_EMAIL;
  }
  return configured;
}

/**
 * Resolves SMTP configuration from server-side environment variables:
 * CONTACT_TO_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 * (plus optional SMTP_FROM and GMAIL_USER / GMAIL_APP_PASSWORD aliases).
 */
export function resolveSmtpConfigFromEnv(): SmtpTransportConfig | null {
  const user = getEnv('SMTP_USER') || getEnv('GMAIL_USER');
  const rawPass = getEnv('SMTP_PASS') || getEnv('GMAIL_APP_PASSWORD');

  if (isPlaceholderCredential(user) || isPlaceholderCredential(rawPass)) {
    return null;
  }

  const host = sanitizeHeaderValue(getEnv('SMTP_HOST')) || 'smtp.gmail.com';
  // Google displays 16-char Gmail App Passwords with spaces ("xxxx xxxx xxxx xxxx");
  // normalize whitespace automatically for Gmail SMTP so pasted App Passwords authenticate cleanly.
  const pass = isGmailHost(host) ? rawPass.replace(/\s+/g, '') : rawPass;

  const rawPortStr = getEnv('SMTP_PORT');
  const parsedPort = rawPortStr ? Number(rawPortStr) : NaN;
  const port =
    Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535
      ? parsedPort
      : 465;

  const explicitSecure = parseBooleanFlag(getEnv('SMTP_SECURE'));
  let secure = explicitSecure !== null ? explicitSecure : port === 465;

  // Guard against the most common TLS misconfiguration on standard SMTP ports:
  // Port 465 requires implicit TLS (secure: true); Port 587 uses STARTTLS (secure: false).
  if (port === 587 && secure) {
    console.warn(
      '[ContactEmail] SMTP_PORT=587 uses STARTTLS, not implicit SSL; normalizing secure=false with requireTLS=true.'
    );
    secure = false;
  } else if (port === 465 && !secure && isGmailHost(host)) {
    console.warn(
      '[ContactEmail] smtp.gmail.com on port 465 requires implicit SSL/TLS; normalizing secure=true.'
    );
    secure = true;
  }

  const requireTLS = !secure && !isLoopbackHost(host) && (port === 587 || isGmailHost(host));
  const configuredFrom = sanitizeHeaderValue(getEnv('SMTP_FROM'));
  const safeUser = sanitizeHeaderValue(user);
  const from = configuredFrom || `"${BRAND.name} Contact" <${safeUser}>`;
  const recipientEmail = getContactRecipientEmail();

  return {
    host,
    port,
    secure,
    requireTLS,
    user: safeUser,
    pass,
    from,
    recipientEmail,
  };
}

export function isResendConfigured(): boolean {
  const key = getEnv('RESEND_API_KEY');
  return !isPlaceholderCredential(key);
}

export function getConfiguredEmailProvider(): 'smtp' | 'resend' | 'none' {
  if (resolveSmtpConfigFromEnv()) return 'smtp';
  if (isResendConfigured()) return 'resend';
  return 'none';
}

export function isEmailTransportConfigured(): boolean {
  return getConfiguredEmailProvider() !== 'none';
}

/**
 * Produces a strictly non-secret configuration diagnostic summary suitable for
 * server logs and `/api/health`. NEVER includes credential values, usernames,
 * passwords, API keys, or private email contents.
 */
export function getContactEmailDiagnostics(): ContactEmailDiagnostics {
  const envPresence: Record<ContactSmtpEnvVar, boolean> = {
    CONTACT_TO_EMAIL: Boolean(getEnv('CONTACT_TO_EMAIL')),
    SMTP_HOST: Boolean(getEnv('SMTP_HOST')),
    SMTP_PORT: Boolean(getEnv('SMTP_PORT')),
    SMTP_SECURE: Boolean(getEnv('SMTP_SECURE')),
    SMTP_USER: Boolean(getEnv('SMTP_USER') || getEnv('GMAIL_USER')),
    SMTP_PASS: Boolean(getEnv('SMTP_PASS') || getEnv('GMAIL_APP_PASSWORD')),
  };

  const issues: string[] = [];
  const rawContactTo = getEnv('CONTACT_TO_EMAIL');
  if (rawContactTo && !isValidEmailAddress(sanitizeHeaderValue(rawContactTo))) {
    issues.push('CONTACT_TO_EMAIL is invalid; defaulting to cosmowires.connect@gmail.com');
  }

  const rawPort = getEnv('SMTP_PORT');
  if (rawPort) {
    const n = Number(rawPort);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      issues.push('SMTP_PORT is not a valid TCP port (1-65535); defaulting to 465');
    }
  }

  const rawSecure = getEnv('SMTP_SECURE');
  if (rawSecure && parseBooleanFlag(rawSecure) === null) {
    issues.push('SMTP_SECURE is not a recognized boolean (true/false); inferring from SMTP_PORT');
  }

  const rawUser = getEnv('SMTP_USER') || getEnv('GMAIL_USER');
  const rawPass = getEnv('SMTP_PASS') || getEnv('GMAIL_APP_PASSWORD');
  if (rawUser && isPlaceholderCredential(rawUser)) {
    issues.push('SMTP_USER contains a template placeholder value');
  }
  if (rawPass && isPlaceholderCredential(rawPass)) {
    issues.push('SMTP_PASS contains a template placeholder value');
  }

  const provider = getConfiguredEmailProvider();
  const missingRequired: string[] = [];
  if (provider === 'none') {
    if (!rawUser || isPlaceholderCredential(rawUser)) missingRequired.push('SMTP_USER');
    if (!rawPass || isPlaceholderCredential(rawPass)) missingRequired.push('SMTP_PASS');
  }

  return {
    configured: provider !== 'none',
    provider,
    envPresence,
    missingRequired,
    issues,
  };
}

/**
 * Creates a non-pooled Nodemailer SMTP transporter compatible with Vercel
 * serverless functions (fresh connection per invocation, strict timeouts).
 * Exported to support automated integration tests against a local SMTP server.
 */
export function createSmtpTransporter(config: SmtpTransportConfig): Transporter {
  const auth =
    config.user && config.pass
      ? {
          user: config.user,
          pass: config.pass,
        }
      : undefined;

  return nodemailer.createTransport({
    pool: false,
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.ignoreTLS ? false : config.requireTLS,
    ignoreTLS: config.ignoreTLS,
    auth,
    tls: config.ignoreTLS ? undefined : { minVersion: 'TLSv1.2' },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function classifySmtpFailureHint(
  err: Error & { code?: string; responseCode?: number }
): string {
  const msg = err.message || '';
  if (err.code === 'EAUTH' || err.responseCode === 535 || err.responseCode === 534) {
    return 'SMTP authentication rejected — for Gmail, confirm 2-Step Verification is enabled and SMTP_PASS is a 16-character Google App Password.';
  }
  if (/wrong version number|ERR_SSL|TLS/i.test(msg)) {
    return 'TLS handshake mismatch — use SMTP_PORT=465 with SMTP_SECURE=true, or SMTP_PORT=587 with SMTP_SECURE=false.';
  }
  if (
    err.code === 'ESOCKET' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ECONNECTION' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND'
  ) {
    return 'Network/host connection error — verify SMTP_HOST, SMTP_PORT, and outbound firewall/provider settings.';
  }
  return 'Upstream SMTP server rejected or aborted delivery.';
}

/**
 * Delivers a contact form email via an explicit SMTP configuration.
 * Only resolves `delivered: true` after the SMTP server explicitly accepts the recipient.
 */
export async function sendContactEmailViaSmtp(
  config: SmtpTransportConfig,
  params: {
    data: SanitizedContactData;
    referenceId: string;
    submittedAt: string;
  }
): Promise<EmailDeliveryResult> {
  const payload = buildContactEmailPayload({
    data: params.data,
    referenceId: params.referenceId,
    submittedAt: params.submittedAt,
    recipientEmail: config.recipientEmail,
  });

  const startedAt = Date.now();
  console.info(
    `[ContactEmail] Attempting SMTP delivery (ref=${params.referenceId}, host=${config.host}, port=${config.port}, secure=${config.secure}, requireTLS=${Boolean(config.requireTLS)}, user=${maskEmailForLogs(config.user)}, to=${maskEmailForLogs(payload.to)})`
  );

  const transporter = createSmtpTransporter(config);
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    const acceptedCount = Array.isArray(info.accepted) ? info.accepted.length : 0;
    const rejectedCount = Array.isArray(info.rejected) ? info.rejected.length : 0;

    if (acceptedCount === 0 || rejectedCount > 0) {
      console.error(
        `[ContactEmail] SMTP server did not accept recipient (ref=${params.referenceId}, accepted=${acceptedCount}, rejected=${rejectedCount}, elapsedMs=${Date.now() - startedAt})`
      );
      throw new EmailDeliveryError(
        `We could not deliver your message right now. Please try again in a moment or email ${payload.to} directly.`,
        502,
        'EMAIL_DELIVERY_FAILED'
      );
    }

    console.info(
      `[ContactEmail] SMTP accepted delivery (ref=${params.referenceId}, messageId=${info.messageId || 'none'}, accepted=${acceptedCount}, elapsedMs=${Date.now() - startedAt})`
    );

    return {
      delivered: true,
      provider: 'smtp',
      messageId: info.messageId || `smtp-${params.referenceId}`,
      recipient: payload.to,
    };
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      throw error;
    }
    const err = error as Error & { code?: string; responseCode?: number; command?: string };
    const codeTag = [err.code, err.responseCode, err.command].filter(Boolean).join('/');
    const hint = classifySmtpFailureHint(err);
    console.error(
      `[ContactEmail] SMTP delivery failed (ref=${params.referenceId}, host=${config.host}:${config.port}, secure=${config.secure}${codeTag ? `, status=${codeTag}` : ''}, elapsedMs=${Date.now() - startedAt}): ${hint}`
    );
    throw new EmailDeliveryError(
      `We could not deliver your message right now. Please try again in a moment or email ${payload.to} directly.`,
      502,
      'EMAIL_DELIVERY_FAILED'
    );
  } finally {
    transporter.close();
  }
}

/**
 * Optional delivery via Resend HTTP API when RESEND_API_KEY is configured
 * instead of SMTP credentials.
 */
async function sendContactEmailViaResend(params: {
  data: SanitizedContactData;
  referenceId: string;
  submittedAt: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = getEnv('RESEND_API_KEY');
  const from =
    sanitizeHeaderValue(getEnv('RESEND_FROM')) || `${BRAND.name} <onboarding@resend.dev>`;
  const recipient = getContactRecipientEmail();

  const payload = buildContactEmailPayload({
    data: params.data,
    referenceId: params.referenceId,
    submittedAt: params.submittedAt,
    recipientEmail: recipient,
  });

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    console.info(
      `[ContactEmail] Attempting Resend API delivery (ref=${params.referenceId}, to=${maskEmailForLogs(payload.to)})`
    );
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        reply_to: payload.replyTo.address,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `[ContactEmail] Resend API rejected request (ref=${params.referenceId}, httpStatus=${response.status}, elapsedMs=${Date.now() - startedAt})`
      );
      throw new EmailDeliveryError(
        `We could not deliver your message right now. Please try again in a moment or email ${payload.to} directly.`,
        502,
        'EMAIL_DELIVERY_FAILED'
      );
    }

    const body = (await response.json()) as { id?: string };
    if (!body?.id) {
      console.error(
        `[ContactEmail] Resend API returned 2xx without message id (ref=${params.referenceId}, elapsedMs=${Date.now() - startedAt})`
      );
      throw new EmailDeliveryError(
        `We could not deliver your message right now. Please try again in a moment or email ${payload.to} directly.`,
        502,
        'EMAIL_DELIVERY_FAILED'
      );
    }

    console.info(
      `[ContactEmail] Resend accepted delivery (ref=${params.referenceId}, messageId=${body.id}, elapsedMs=${Date.now() - startedAt})`
    );

    return {
      delivered: true,
      provider: 'resend',
      messageId: body.id,
      recipient: payload.to,
    };
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      throw error;
    }
    const errName = error instanceof Error ? error.name : 'Error';
    console.error(
      `[ContactEmail] Resend delivery failed (ref=${params.referenceId}, error=${errName}, elapsedMs=${Date.now() - startedAt})`
    );
    throw new EmailDeliveryError(
      `We could not deliver your message right now. Please try again in a moment or email ${payload.to} directly.`,
      502,
      'EMAIL_DELIVERY_FAILED'
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Primary server-side email delivery entry point for Contact Us submissions.
 * Never fakes delivery: fails honestly with HTTP 503 if credentials are absent.
 */
export async function sendContactEmail(params: {
  data: SanitizedContactData;
  referenceId: string;
  submittedAt: string;
}): Promise<EmailDeliveryResult> {
  const smtpConfig = resolveSmtpConfigFromEnv();
  if (smtpConfig) {
    return sendContactEmailViaSmtp(smtpConfig, params);
  }

  if (isResendConfigured()) {
    return sendContactEmailViaResend(params);
  }

  const diagnostics = getContactEmailDiagnostics();
  const recipient = getContactRecipientEmail();
  console.error(
    `[ContactEmail] Email delivery is not configured (ref=${params.referenceId}, runtime=${process.env.VERCEL ? 'vercel' : 'node'}, missingRequired=[${diagnostics.missingRequired.join(', ')}], envPresence=${JSON.stringify(diagnostics.envPresence)}${diagnostics.issues.length ? `, issues=[${diagnostics.issues.join('; ')}]` : ''}).`
  );
  throw new EmailDeliveryError(
    `${CONTACT_ERROR_MESSAGE} Contact form email delivery is currently unavailable on the server — please email ${recipient} directly.`,
    503,
    'EMAIL_NOT_CONFIGURED'
  );
}
