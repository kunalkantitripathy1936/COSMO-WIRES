import { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { BRAND } from '../config/brand';
import { apiUrl } from '../config/api';
import {
  CONTACT_DUPLICATE_MESSAGE,
  CONTACT_ERROR_MESSAGE,
  CONTACT_LIMITS,
  CONTACT_RECIPIENT_EMAIL,
  CONTACT_SUCCESS_MESSAGE,
  ContactFieldErrors,
  ContactFieldName,
  computeContactFingerprint,
  validateContactFormInput,
} from '../utils/contactLogic';
import { OrbitalAccent, Reveal } from '../components/motion/CosmicPrimitives';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  // Hidden honeypot field for basic automated spam filtering
  const [website, setWebsite] = useState('');

  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [feedback, setFeedback] = useState('');
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const formLoadedAtRef = useRef<number>(Date.now());
  const inFlightRef = useRef<boolean>(false);
  const lastSubmissionRef = useRef<{ fingerprint: string; submittedAt: number } | null>(null);

  const clearFieldError = (field: ContactFieldName) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (status === 'error' || status === 'success') {
      setStatus('idle');
      setFeedback('');
      setReferenceId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Synchronous duplicate-click protection
    if (inFlightRef.current || status === 'submitting') {
      return;
    }

    const validation = validateContactFormInput({
      name,
      email,
      subject,
      message,
      website,
    });

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setStatus('error');
      setFeedback(validation.message);
      setReferenceId(null);
      return;
    }

    const fingerprint = computeContactFingerprint(validation.data);
    const now = Date.now();
    if (
      lastSubmissionRef.current &&
      lastSubmissionRef.current.fingerprint === fingerprint &&
      now - lastSubmissionRef.current.submittedAt < CONTACT_LIMITS.duplicateWindowMs
    ) {
      setStatus('error');
      setFeedback(CONTACT_DUPLICATE_MESSAGE);
      setReferenceId(null);
      return;
    }

    inFlightRef.current = true;
    setFieldErrors({});
    setStatus('submitting');
    setFeedback('');
    setReferenceId(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          name: validation.data.name,
          email: validation.data.email,
          subject: validation.data.subject,
          message: validation.data.message,
          website,
          formLoadedAt: formLoadedAtRef.current,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        setStatus('error');
        setFeedback(
          `${CONTACT_ERROR_MESSAGE} You can also email ${CONTACT_RECIPIENT_EMAIL} directly.`
        );
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        delivered?: boolean;
        message?: string;
        error?: string;
        code?: string;
        fieldErrors?: ContactFieldErrors;
      };

      // Confirm success ONLY after the server explicitly confirms acceptance for delivery
      if (!response.ok || data.delivered !== true || !data.id) {
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
          setFieldErrors(data.fieldErrors);
        }
        setStatus('error');
        if (
          response.status === 400 ||
          response.status === 409 ||
          response.status === 429 ||
          response.status === 502 ||
          response.status === 503
        ) {
          setFeedback(data.error || CONTACT_ERROR_MESSAGE);
        } else {
          setFeedback(CONTACT_ERROR_MESSAGE);
        }
        return;
      }

      lastSubmissionRef.current = {
        fingerprint,
        submittedAt: Date.now(),
      };
      formLoadedAtRef.current = Date.now();

      setStatus('success');
      setFeedback(data.message || CONTACT_SUCCESS_MESSAGE);
      setReferenceId(data.id);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setWebsite('');
    } catch (error) {
      setStatus('error');
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFeedback(
          `The request timed out while contacting the mail server. Please try again or email ${CONTACT_RECIPIENT_EMAIL} directly.`
        );
      } else {
        setFeedback(
          `${CONTACT_ERROR_MESSAGE} You can also email ${CONTACT_RECIPIENT_EMAIL} directly.`
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      inFlightRef.current = false;
    }
  };

  return (
    <div className="relative overflow-hidden">
      <OrbitalAccent variant="blue" position="top-right" />
      <OrbitalAccent variant="violet" position="bottom-left" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {/* Header */}
        <Reveal>
          <header className="border-b border-[#1E293B] pb-8">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#60A5FA]">
              {BRAND.name} · Direct Dispatch
            </p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-medium tracking-[0.02em] text-[#F8FAFC]">
              GET IN TOUCH
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#CBD5E1]">
              Have a question, suggestion, collaboration idea, or feedback? We&apos;d love to hear from you.
            </p>
          </header>
        </Reveal>

        {/* Main Content Grid */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Editorial Contact Details Column */}
          <Reveal delay={0.05} className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-6 space-y-5">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#60A5FA]">
                  Direct Email
                </p>
                <a
                  href={`mailto:${CONTACT_RECIPIENT_EMAIL}`}
                  className="mt-2.5 inline-flex items-center gap-2.5 text-[13px] sm:text-sm font-medium text-[#F1F5F9] hover:text-[#60A5FA] transition-colors whitespace-nowrap"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1E293B] bg-[#121A2B] text-[#60A5FA]">
                    <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>{CONTACT_RECIPIENT_EMAIL}</span>
                </a>
                <p className="mt-2.5 text-xs leading-relaxed text-[#94A3B8]">
                  Every message submitted through this form is routed directly to our editorial inbox with your email set as the reply address.
                </p>
              </div>

              <div className="border-t border-[#1E293B] pt-5 space-y-3">
                <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/15 text-[#A78BFA]">
                    <Compass className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>How We Can Help</span>
                </div>
                <ul className="space-y-2 text-xs leading-relaxed text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#3B82F6] shrink-0" />
                    <span>Reader questions, topic suggestions, and feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#8B5CF6] shrink-0" />
                    <span>Observatory press releases and research collaborations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#3B82F6] shrink-0" />
                    <span>Scientific corrections and publisher syndication inquiries</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-[#1E293B] pt-5 flex items-start gap-2.5 text-xs leading-relaxed text-[#94A3B8]">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1E293B] bg-[#121A2B] text-[#60A5FA]">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>
                  Your contact details are used solely to respond to your inquiry and are never shared with third parties.
                </span>
              </div>
            </div>
          </Reveal>

          {/* Contact Form Column */}
          <Reveal delay={0.1} className="lg:col-span-8">
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={status === 'submitting'}
              className="relative rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/95 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.45)] space-y-6"
            >
              {/* Subtle top hairline accent */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/60 to-transparent"
              />

              {/* Hidden Honeypot Field (Spam Protection) */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-medium uppercase tracking-wider text-[#CBD5E1]"
                  >
                    Full Name <span className="text-[#60A5FA]" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={CONTACT_LIMITS.nameMax}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    placeholder="Dr. Elena Vance"
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                    disabled={status === 'submitting'}
                    className={`mt-2 h-11 w-full rounded-xl border bg-[#07090E] px-4 text-sm text-[#F8FAFC] placeholder-[#64748B] transition-colors focus:outline-none disabled:opacity-60 ${
                      fieldErrors.name
                        ? 'border-[#F87171]/70 focus:border-[#F87171]'
                        : 'border-[#1E293B] focus:border-[#3B82F6]'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p id="contact-name-error" className="mt-1.5 text-xs text-[#FCA5A5]">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-medium uppercase tracking-wider text-[#CBD5E1]"
                  >
                    Email Address <span className="text-[#60A5FA]" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={CONTACT_LIMITS.emailMax}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    placeholder="you@example.com"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                    disabled={status === 'submitting'}
                    className={`mt-2 h-11 w-full rounded-xl border bg-[#07090E] px-4 text-sm text-[#F8FAFC] placeholder-[#64748B] transition-colors focus:outline-none disabled:opacity-60 ${
                      fieldErrors.email
                        ? 'border-[#F87171]/70 focus:border-[#F87171]'
                        : 'border-[#1E293B] focus:border-[#3B82F6]'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="contact-email-error" className="mt-1.5 text-xs text-[#FCA5A5]">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-xs font-medium uppercase tracking-wider text-[#CBD5E1]"
                >
                  Subject <span className="text-[#60A5FA]" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  required
                  maxLength={CONTACT_LIMITS.subjectMax}
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    clearFieldError('subject');
                  }}
                  placeholder="e.g., Collaboration Idea, Scientific Feedback, Press Release"
                  aria-invalid={Boolean(fieldErrors.subject)}
                  aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
                  disabled={status === 'submitting'}
                  className={`mt-2 h-11 w-full rounded-xl border bg-[#07090E] px-4 text-sm text-[#F8FAFC] placeholder-[#64748B] transition-colors focus:outline-none disabled:opacity-60 ${
                    fieldErrors.subject
                      ? 'border-[#F87171]/70 focus:border-[#F87171]'
                      : 'border-[#1E293B] focus:border-[#3B82F6]'
                  }`}
                />
                {fieldErrors.subject && (
                  <p id="contact-subject-error" className="mt-1.5 text-xs text-[#FCA5A5]">
                    {fieldErrors.subject}
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-medium uppercase tracking-wider text-[#CBD5E1]"
                  >
                    Message <span className="text-[#60A5FA]" aria-hidden="true">*</span>
                  </label>
                  <span className="font-mono text-[11px] text-[#64748B] tabular-nums">
                    {message.length} / {CONTACT_LIMITS.messageMax}
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  required
                  maxLength={CONTACT_LIMITS.messageMax}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    clearFieldError('message');
                  }}
                  placeholder="Share the details of your question, suggestion, collaboration idea, or feedback..."
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                  disabled={status === 'submitting'}
                  className={`mt-2 w-full rounded-xl border bg-[#07090E] p-4 text-sm leading-relaxed text-[#F8FAFC] placeholder-[#64748B] transition-colors focus:outline-none disabled:opacity-60 resize-y ${
                    fieldErrors.message
                      ? 'border-[#F87171]/70 focus:border-[#F87171]'
                      : 'border-[#1E293B] focus:border-[#3B82F6]'
                  }`}
                />
                {fieldErrors.message && (
                  <p id="contact-message-error" className="mt-1.5 text-xs text-[#FCA5A5]">
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              {/* Status Feedback Banner */}
              {feedback && (
                <div
                  role={status === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3.5 text-sm ${
                    status === 'success'
                      ? 'border-[#22C55E]/35 bg-[#052E16]/40 text-[#BBF7D0]'
                      : 'border-[#EF4444]/35 bg-[#450A0A]/40 text-[#FECACA]'
                  }`}
                >
                  {status === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F87171]" aria-hidden="true" />
                  )}
                  <div className="space-y-1">
                    <p className="leading-relaxed">{feedback}</p>
                    {status === 'success' && referenceId && (
                      <p className="font-mono text-xs text-[#86EFAC]/80">
                        Reference ID: {referenceId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Action */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                <p className="text-xs text-[#64748B]">
                  All fields marked with <span className="text-[#60A5FA]">*</span> are required.
                </p>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#2563EB] pl-3 pr-6 text-sm font-medium text-white hover:bg-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/60 focus:ring-offset-2 focus:ring-offset-[#0D121E] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-[0_8px_22px_rgba(37,99,235,0.28)]"
                >
                  {status === 'submitting' ? (
                    <>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span>Sending Message…</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                        <Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
