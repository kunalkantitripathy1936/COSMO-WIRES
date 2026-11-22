import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Compass,
  Copy,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BRAND } from '../config/brand';
import { OrbitalAccent, Reveal } from '../components/motion/CosmicPrimitives';

const CONTACT_EMAIL = BRAND.contactEmail;
const MAILTO_HREF = `mailto:${CONTACT_EMAIL}`;

const INQUIRY_AREAS = [
  {
    icon: Compass,
    accent: 'blue' as const,
    title: 'Scientific Questions & Topics',
    description:
      'Have a question about astronomy, astrophysics, cosmology, or an active mission? Suggest topics you would like our desk to cover.',
  },
  {
    icon: Sparkles,
    accent: 'violet' as const,
    title: 'Press & Research Collaborations',
    description:
      'Observatories, universities, and science communicators are welcome to share press briefings, datasets, and collaboration ideas.',
  },
  {
    icon: ShieldCheck,
    accent: 'blue' as const,
    title: 'Corrections & Attribution',
    description:
      'Spot a factual error, broken publisher link, or attribution update? Let us know so we can review and address it promptly.',
  },
] as const;

export function ContactPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(CONTACT_EMAIL);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = CONTACT_EMAIL;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard API unavailable; mailto link remains directly clickable
    }
  };

  return (
    <div className="relative overflow-hidden">
      <OrbitalAccent variant="blue" position="top-right" />
      <OrbitalAccent variant="violet" position="bottom-left" />

      <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {/* Header */}
        <Reveal>
          <header className="border-b border-[#1E293B] pb-8">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#60A5FA]">
              {BRAND.name} · Editorial Desk
            </p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-medium tracking-[0.02em] text-[#F8FAFC]">
              GET IN TOUCH
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#CBD5E1]">
              Have a scientific question, editorial suggestion, correction, or collaboration inquiry?
              Reach out to our editorial desk directly.
            </p>
          </header>
        </Reveal>

        {/* Primary Direct-Email Dispatch Card */}
        <Reveal delay={0.06} className="mt-10">
          <section
            aria-label="Direct editorial email contact"
            className="relative overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/95 p-7 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          >
            {/* Subtle top hairline accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/65 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#2563EB]/10 blur-3xl"
            />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/35 bg-[#121A2B] text-[#60A5FA]">
                    <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#60A5FA]">
                    Official Contact Email
                  </p>
                </div>

                <div>
                  <a
                    href={MAILTO_HREF}
                    className="group inline-block font-serif text-[19px] sm:text-2xl md:text-3xl font-medium text-[#F8FAFC] hover:text-[#60A5FA] transition-colors"
                  >
                    <span>
                      cosmowires.connect<wbr />@gmail.com
                    </span>
                    <ArrowUpRight
                      className="inline-block ml-2 -mt-0.5 h-4 w-4 sm:h-5 sm:w-5 text-[#60A5FA] opacity-75 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </a>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#94A3B8]">
                    Send your message straight from your preferred email client on desktop or mobile.
                    Including a clear subject line and relevant article link helps our editors respond faster.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <a
                  href={MAILTO_HREF}
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-[#2563EB] pl-3.5 pr-6 text-sm font-medium text-white hover:bg-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/60 focus:ring-offset-2 focus:ring-offset-[#0D121E] transition-colors shadow-[0_8px_22px_rgba(37,99,235,0.3)] whitespace-nowrap"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>Email Us</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#1E293B] bg-[#07090E]/90 px-5 text-sm font-medium text-[#CBD5E1] hover:border-[#334155] hover:bg-[#121A2B] hover:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-[#4ADE80]" strokeWidth={2} aria-hidden="true" />
                      <span className="text-[#BBF7D0]">Address Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-[#94A3B8]" strokeWidth={1.75} aria-hidden="true" />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Editorial Inquiry Areas Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {INQUIRY_AREAS.map((area, index) => {
            const Icon = area.icon;
            const iconClasses =
              area.accent === 'violet'
                ? 'border-[#8B5CF6]/35 bg-[#8B5CF6]/15 text-[#A78BFA]'
                : 'border-[#3B82F6]/30 bg-[#121A2B] text-[#60A5FA]';

            return (
              <Reveal key={area.title} delay={0.1 + index * 0.05} className="h-full">
                <div className="h-full rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/85 p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${iconClasses}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h2 className="font-serif text-lg font-medium text-[#F8FAFC]">{area.title}</h2>
                    <p className="text-sm leading-relaxed text-[#94A3B8]">{area.description}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Privacy Assurance Strip */}
        <Reveal delay={0.22} className="mt-8">
          <div className="flex items-start sm:items-center gap-3 rounded-2xl border border-[#1E293B]/80 bg-[#090D16]/90 px-5 py-4 text-xs leading-relaxed text-[#94A3B8]">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1E293B] bg-[#121A2B] text-[#60A5FA]">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <p>
              Emails sent to{' '}
              <a
                href={MAILTO_HREF}
                className="font-medium text-[#CBD5E1] hover:text-[#60A5FA] transition-colors"
              >
                {CONTACT_EMAIL}
              </a>{' '}
              are used solely to respond to your inquiry and are never shared with third parties.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
