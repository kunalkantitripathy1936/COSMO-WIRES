import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CONTACT_DUPLICATE_MESSAGE,
  CONTACT_LIMITS,
  CONTACT_SUCCESS_MESSAGE,
  type ContactFieldErrors,
  computeContactFingerprint,
  validateContactFormInput,
} from '../src/utils/contactLogic.js';
import { sendContactEmail } from './emailService.js';

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'cosmo-wires-data')
  : path.resolve(process.cwd(), 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

// In-memory deduplication & concurrency guard for Contact Us submissions
const recentContactSubmissions = new Map<string, number>();
const inFlightContactSubmissions = new Set<string>();

export interface ContactInquiryRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
  deliveredTo: string;
  emailMessageId: string;
}

export interface ContactSubmissionResponse {
  id: string;
  submittedAt: string;
  delivered: true;
  message: string;
}

export class ContactRequestError extends Error {
  public readonly status: number;
  public readonly fieldErrors?: ContactFieldErrors;
  public readonly code?: string;

  constructor(
    message: string,
    status: number,
    options?: { fieldErrors?: ContactFieldErrors; code?: string }
  ) {
    super(message);
    this.name = 'ContactRequestError';
    this.status = status;
    this.fieldErrors = options?.fieldErrors;
    this.code = options?.code;
  }
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(filePath: string, data: T[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function pruneRecentSubmissions(nowMs: number): void {
  for (const [key, expiresAt] of recentContactSubmissions.entries()) {
    if (nowMs >= expiresAt) {
      recentContactSubmissions.delete(key);
    }
  }
}

export async function submitContactInquiry(rawBody: unknown): Promise<ContactSubmissionResponse> {
  const nowMs = Date.now();
  const validation = validateContactFormInput(rawBody, {
    checkAntiSpam: true,
    nowMs,
  });

  if (!validation.valid) {
    throw new ContactRequestError(validation.message, 400, {
      fieldErrors: validation.fieldErrors,
      code: validation.isSpam ? 'SPAM_REJECTED' : 'VALIDATION_ERROR',
    });
  }

  const { data } = validation;
  const fingerprintHash = crypto
    .createHash('sha256')
    .update(computeContactFingerprint(data))
    .digest('hex');

  pruneRecentSubmissions(nowMs);
  const duplicateExpiresAt = recentContactSubmissions.get(fingerprintHash);
  if (
    inFlightContactSubmissions.has(fingerprintHash) ||
    (duplicateExpiresAt !== undefined && nowMs < duplicateExpiresAt)
  ) {
    throw new ContactRequestError(CONTACT_DUPLICATE_MESSAGE, 409, {
      code: 'DUPLICATE_SUBMISSION',
    });
  }

  const referenceId = `cw-${nowMs.toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  const submittedAt = new Date(nowMs).toISOString();

  inFlightContactSubmissions.add(fingerprintHash);
  try {
    // Deliver email FIRST — never report success unless the email provider accepted the message
    const delivery = await sendContactEmail({
      data,
      referenceId,
      submittedAt,
    });

    recentContactSubmissions.set(fingerprintHash, Date.now() + CONTACT_LIMITS.duplicateWindowMs);

    const record: ContactInquiryRecord = {
      id: referenceId,
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      submittedAt,
      deliveredTo: delivery.recipient,
      emailMessageId: delivery.messageId,
    };

    try {
      const inquiries = await readJsonArray<ContactInquiryRecord>(INQUIRIES_FILE);
      inquiries.push(record);
      await writeJsonArray(INQUIRIES_FILE, inquiries);
    } catch (storageErr) {
      // Email was already delivered; log local archive failure without breaking user confirmation
      console.error('[ContactStorage] Failed to archive delivered inquiry locally:', storageErr);
    }

    return {
      id: record.id,
      submittedAt: record.submittedAt,
      delivered: true,
      message: CONTACT_SUCCESS_MESSAGE,
    };
  } finally {
    inFlightContactSubmissions.delete(fingerprintHash);
  }
}
