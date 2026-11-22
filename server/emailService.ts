import nodemailer, { Transporter } from 'nodemailer';
import {
  CONTACT_ERROR_MESSAGE,
  CONTACT_RECIPIENT_EMAIL,
  SanitizedContactData,
  buildContactEmailPayload,
  sanitizeHeaderValue,
} from '../src/utils/contactLogic';
import { BRAND } from '../src/config/brand';

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
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

function getEnv(name: string): string {
  return process.env[name]?.trim() || '';
}

export function getContactRecipientEmail(): string {
  const configured = getEnv('CONTACT_TO_EMAIL');
  return configured ? sanitizeHeaderValue(configured) : CONTACT_RECIPIENT_EMAIL;
}

/**
 * Resolves SMTP configuration from server-side environment variables.
 * Supports Gmail SMTP (SMTP_USER + SMTP_PASS or GMAIL_USER + GMAIL_APP_PASSWORD)
 * as well as custom SMTP servers (SMTP_HOST, SMTP_PORT, SMTP_SECURE).
 */
export function resolveSmtpConfigFromEnv(): SmtpTransportConfig | null {
  const user = getEnv('SMTP_USER') || getEnv('GMAIL_USER');
  const pass = getEnv('SMTP_PASS') || getEnv('GMAIL_APP_PASSWORD');

  if (!user || !pass) {
    return null;
  }

  const host = getEnv('SMTP_HOST') || 'smtp.gmail.com';
  const rawPort = Number(getEnv('SMTP_PORT'));
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 465;

  const rawSecure = getEnv('SMTP_SECURE').toLowerCase();
  const secure =
    rawSecure === 'true' ? true : rawSecure === 'false' ? false : port === 465;

  const from = getEnv('SMTP_FROM') || `"${BRAND.name} Contact" <${user}>`;
  const recipientEmail = getContactRecipientEmail();

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    recipientEmail,
  };
}

export function isResendConfigured(): boolean {
  return Boolean(getEnv('RESEND_API_KEY'));
}

export function isEmailTransportConfigured(): boolean {
  return Boolean(resolveSmtpConfigFromEnv() || isResendConfigured());
}

/**
 * Creates a Nodemailer SMTP transporter with safe connection timeouts.
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
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
    ignoreTLS: config.ignoreTLS,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

/**
 * Delivers a contact form email via an explicit SMTP configuration.
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

    return {
      delivered: true,
      provider: 'smtp',
      messageId: info.messageId || `smtp-${params.referenceId}`,
      recipient: payload.to,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown SMTP transport error';
    console.error(`[ContactEmail] SMTP delivery failed (${config.host}:${config.port}): ${errMessage}`);
    throw new EmailDeliveryError(CONTACT_ERROR_MESSAGE, 502, 'EMAIL_DELIVERY_FAILED');
  } finally {
    transporter.close();
  }
}

/**
 * Optional fallback delivery via Resend HTTP API when RESEND_API_KEY is configured
 * instead of SMTP credentials.
 */
async function sendContactEmailViaResend(params: {
  data: SanitizedContactData;
  referenceId: string;
  submittedAt: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = getEnv('RESEND_API_KEY');
  const from = getEnv('RESEND_FROM') || `${BRAND.name} <onboarding@resend.dev>`;
  const recipient = getContactRecipientEmail();

  const payload = buildContactEmailPayload({
    data: params.data,
    referenceId: params.referenceId,
    submittedAt: params.submittedAt,
    recipientEmail: recipient,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
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
      console.error(`[ContactEmail] Resend API returned HTTP ${response.status}`);
      throw new EmailDeliveryError(CONTACT_ERROR_MESSAGE, 502, 'EMAIL_DELIVERY_FAILED');
    }

    const body = (await response.json()) as { id?: string };
    return {
      delivered: true,
      provider: 'resend',
      messageId: body.id || `resend-${params.referenceId}`,
      recipient: payload.to,
    };
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      throw error;
    }
    const errMessage = error instanceof Error ? error.message : 'Unknown Resend API error';
    console.error(`[ContactEmail] Resend delivery failed: ${errMessage}`);
    throw new EmailDeliveryError(CONTACT_ERROR_MESSAGE, 502, 'EMAIL_DELIVERY_FAILED');
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

  console.error(
    '[ContactEmail] Email delivery is not configured. Set SMTP_USER and SMTP_PASS (Gmail App Password) or RESEND_API_KEY in server environment variables.'
  );
  throw new EmailDeliveryError(CONTACT_ERROR_MESSAGE, 503, 'EMAIL_NOT_CONFIGURED');
}
