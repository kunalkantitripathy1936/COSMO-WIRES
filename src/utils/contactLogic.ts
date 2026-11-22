import { BRAND } from '../config/brand.js';

export const CONTACT_RECIPIENT_EMAIL = 'cosmowires.connect@gmail.com';
export const CONTACT_SUCCESS_MESSAGE =
  'Your message has been sent successfully. Thank you for contacting COSMO WIRES!';
export const CONTACT_ERROR_MESSAGE =
  'Your message could not be sent. Please try again later.';
export const CONTACT_DUPLICATE_MESSAGE =
  'This message was already submitted recently. Please wait a moment before sending again.';

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 160,
  subjectMin: 3,
  subjectMax: 150,
  messageMin: 10,
  messageMax: 3000,
  minHumanFillMs: 1200,
  duplicateWindowMs: 2 * 60 * 1000,
} as const;

// Practical RFC-compatible email format check rejecting whitespace & consecutive dots
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface ContactFormInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
  formLoadedAt?: number;
}

export interface SanitizedContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type ContactFieldName = 'name' | 'email' | 'subject' | 'message';

export type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;

export type ContactValidationResult =
  | {
      valid: true;
      data: SanitizedContactData;
    }
  | {
      valid: false;
      isSpam?: boolean;
      message: string;
      fieldErrors: ContactFieldErrors;
    };

export interface ContactEmailPayload {
  to: string;
  replyTo: {
    name: string;
    address: string;
  };
  subject: string;
  text: string;
  html: string;
}

/**
 * Strips CR, LF, NUL, and ASCII control characters from header fields to prevent
 * SMTP / MIME email header injection.
 */
export function sanitizeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\r\n\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Escapes HTML special characters for safe interpolation inside HTML email templates.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isValidEmailAddress(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > CONTACT_LIMITS.emailMax) return false;
  if (trimmed.includes('..') || /[\r\n]/.test(trimmed)) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates contact form fields on both client and server.
 * When `checkAntiSpam` is enabled (server-side), enforces hidden honeypot and
 * minimum human interaction elapsed time if `formLoadedAt` was supplied.
 */
export function validateContactFormInput(
  rawInput: unknown,
  options: { checkAntiSpam?: boolean; nowMs?: number } = {}
): ContactValidationResult {
  const { checkAntiSpam = false, nowMs = Date.now() } = options;

  if (!rawInput || typeof rawInput !== 'object') {
    return {
      valid: false,
      message: 'Please complete all required fields.',
      fieldErrors: {
        name: 'Full Name is required.',
        email: 'Email Address is required.',
        subject: 'Subject is required.',
        message: 'Message is required.',
      },
    };
  }

  const raw = rawInput as Record<string, unknown>;

  // Anti-spam Check 1: Hidden honeypot field must remain empty
  if (checkAntiSpam && typeof raw.website === 'string' && raw.website.trim().length > 0) {
    return {
      valid: false,
      isSpam: true,
      message: 'Spam submission rejected.',
      fieldErrors: {},
    };
  }

  // Anti-spam Check 2: Minimum human interaction duration (if timestamp provided)
  if (
    checkAntiSpam &&
    typeof raw.formLoadedAt === 'number' &&
    Number.isFinite(raw.formLoadedAt)
  ) {
    const elapsedMs = nowMs - raw.formLoadedAt;
    if (elapsedMs >= 0 && elapsedMs < CONTACT_LIMITS.minHumanFillMs) {
      return {
        valid: false,
        isSpam: true,
        message: 'Please take a moment to review your message before submitting.',
        fieldErrors: {},
      };
    }
  }

  const name = typeof raw.name === 'string' ? sanitizeHeaderValue(raw.name) : '';
  const email = typeof raw.email === 'string' ? sanitizeHeaderValue(raw.email).toLowerCase() : '';
  const subject = typeof raw.subject === 'string' ? sanitizeHeaderValue(raw.subject) : '';
  const message =
    typeof raw.message === 'string'
      ? // Strip NUL and non-printable ASCII control chars while preserving tabs and line breaks
        // eslint-disable-next-line no-control-regex
        raw.message.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+/g, '').trim()
      : '';

  // Anti-spam Check 3: Block link-farm spam messages stuffed with excessive URLs
  if (checkAntiSpam) {
    const urlMatches = message.match(/https?:\/\/\S+/gi);
    if (urlMatches && urlMatches.length > 8) {
      return {
        valid: false,
        isSpam: true,
        message: 'Message rejected by spam filter (too many links).',
        fieldErrors: {},
      };
    }
  }

  const fieldErrors: ContactFieldErrors = {};

  if (!name) {
    fieldErrors.name = 'Please enter your full name.';
  } else if (name.length < CONTACT_LIMITS.nameMin) {
    fieldErrors.name = `Full name must be at least ${CONTACT_LIMITS.nameMin} characters.`;
  } else if (name.length > CONTACT_LIMITS.nameMax) {
    fieldErrors.name = `Full name must be under ${CONTACT_LIMITS.nameMax} characters.`;
  }

  if (!email) {
    fieldErrors.email = 'Please enter your email address.';
  } else if (!isValidEmailAddress(email)) {
    fieldErrors.email = 'Please enter a valid email address.';
  }

  if (!subject) {
    fieldErrors.subject = 'Please enter a subject for your message.';
  } else if (subject.length < CONTACT_LIMITS.subjectMin) {
    fieldErrors.subject = `Subject must be at least ${CONTACT_LIMITS.subjectMin} characters.`;
  } else if (subject.length > CONTACT_LIMITS.subjectMax) {
    fieldErrors.subject = `Subject must be under ${CONTACT_LIMITS.subjectMax} characters.`;
  }

  if (!message) {
    fieldErrors.message = 'Please enter your message.';
  } else if (message.length < CONTACT_LIMITS.messageMin) {
    fieldErrors.message = `Message must be at least ${CONTACT_LIMITS.messageMin} characters.`;
  } else if (message.length > CONTACT_LIMITS.messageMax) {
    fieldErrors.message = `Message must be under ${CONTACT_LIMITS.messageMax} characters.`;
  }

  const errorMessages = Object.values(fieldErrors);
  if (errorMessages.length > 0) {
    return {
      valid: false,
      message: errorMessages[0] ?? 'Please review the highlighted fields.',
      fieldErrors,
    };
  }

  return {
    valid: true,
    data: { name, email, subject, message },
  };
}

/**
 * Computes a deterministic normalized fingerprint string for duplicate-submission detection.
 */
export function computeContactFingerprint(data: SanitizedContactData): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${norm(data.email)}::${norm(data.subject)}::${norm(data.message)}`;
}

/**
 * Formats a clean, injection-safe plain-text and HTML email payload for delivery to COSMO WIRES.
 */
export function buildContactEmailPayload(params: {
  data: SanitizedContactData;
  referenceId: string;
  submittedAt: string;
  recipientEmail?: string;
}): ContactEmailPayload {
  const { data, referenceId, submittedAt } = params;
  const recipient = sanitizeHeaderValue(params.recipientEmail || CONTACT_RECIPIENT_EMAIL) || CONTACT_RECIPIENT_EMAIL;

  const safeName = sanitizeHeaderValue(data.name);
  const safeEmail = sanitizeHeaderValue(data.email).toLowerCase();
  const safeSubject = sanitizeHeaderValue(data.subject);
  const emailSubject = `New Contact Query – ${BRAND.name}: ${safeSubject}`.slice(0, 220);

  const text = [
    `New Contact Query – ${BRAND.name}`,
    `============================================================`,
    `Reference ID: ${referenceId}`,
    `Submitted At (UTC): ${submittedAt}`,
    ``,
    `From: ${safeName}`,
    `Reply-To Email: ${safeEmail}`,
    `Subject: ${safeSubject}`,
    ``,
    `Message:`,
    `------------------------------------------------------------`,
    data.message,
    `------------------------------------------------------------`,
    ``,
    `Sent via ${BRAND.name} Contact Us Form (${BRAND.tagline})`,
  ].join('\n');

  const escapedMessageHtml = escapeHtml(data.message).replace(/\r?\n/g, '<br />');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#07090E;color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background-color:#0D121E;border:1px solid #1E293B;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;border-bottom:1px solid #1E293B;background-color:#090D16;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#60A5FA;font-family:monospace;">
            ${escapeHtml(BRAND.name)} · CONTACT INQUIRY
          </p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;color:#F8FAFC;">
            New Contact Query – ${escapeHtml(BRAND.name)}
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:8px 0;width:130px;color:#94A3B8;vertical-align:top;">Full Name</td>
              <td style="padding:8px 0;color:#F8FAFC;font-weight:500;">${escapeHtml(safeName)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94A3B8;vertical-align:top;">Email Address</td>
              <td style="padding:8px 0;color:#60A5FA;">
                <a href="mailto:${escapeHtml(safeEmail)}" style="color:#60A5FA;text-decoration:none;">${escapeHtml(safeEmail)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94A3B8;vertical-align:top;">Subject</td>
              <td style="padding:8px 0;color:#F8FAFC;font-weight:500;">${escapeHtml(safeSubject)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94A3B8;vertical-align:top;">Reference ID</td>
              <td style="padding:8px 0;color:#CBD5E1;font-family:monospace;font-size:12px;">${escapeHtml(referenceId)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94A3B8;vertical-align:top;">Submitted (UTC)</td>
              <td style="padding:8px 0;color:#CBD5E1;font-family:monospace;font-size:12px;">${escapeHtml(submittedAt)}</td>
            </tr>
          </table>

          <div style="margin-top:20px;padding:18px;background-color:#07090E;border:1px solid #1E293B;border-radius:6px;">
            <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;font-family:monospace;">
              Message
            </p>
            <div style="font-size:14px;line-height:1.65;color:#E2E8F0;word-break:break-word;">
              ${escapedMessageHtml}
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;border-top:1px solid #1E293B;background-color:#090D16;font-size:12px;color:#64748B;">
          Reply directly to this email to respond to ${escapeHtml(safeName)} (${escapeHtml(safeEmail)}).
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    to: recipient,
    replyTo: {
      name: safeName,
      address: safeEmail,
    },
    subject: emailSubject,
    text,
    html,
  };
}
