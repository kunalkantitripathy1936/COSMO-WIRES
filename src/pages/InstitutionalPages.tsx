import { Mail } from 'lucide-react';
import { BRAND } from '../config/brand';
import { RoutePath } from '../types';

export { ContactPage } from './ContactPage';

export function AboutPage({ onNavigate }: { onNavigate: (path: RoutePath) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20 space-y-10">
      <header className="border-b border-[#1E293B] pb-8">
        <p className="text-xs font-mono text-[#60A5FA] tracking-wider">
          About the Publication
        </p>
        <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC]">
          {BRAND.taglineTitleCase}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#CBD5E1]">
          {BRAND.name} is an independent digital science publication built for readers who want verified astronomy, astrophysics, cosmology, and space exploration reporting without sensationalism.
        </p>
      </header>

      <section className="space-y-4 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F1F5F9]">Our Mission</h2>
        <p>
          Modern space science unfolds across observatories, space agencies, and scientific publications around the world. {BRAND.name} aggregates and summarizes verified dispatches from primary space agencies — including NASA, ESA, and ISRO coverage via Spaceflight News API v4 — alongside established space journalism outlets such as Space.com, Universe Today, Phys.org, and ScienceDaily.
        </p>
        <p>
          Rather than reproducing copyrighted reporting, we present accurate headlines, concise permitted excerpts, structured scientific categorization, transparent publication and retrieval timestamps, and direct links to the original publishers.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 border-y border-[#1E293B] py-8">
        <div>
          <p className="font-mono text-2xl font-semibold text-[#F8FAFC] tabular-nums">8+</p>
          <p className="mt-1 text-sm font-medium text-[#CBD5E1]">Verified News Sources</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Official RSS, Atom, and public API feeds refreshed automatically on a 15-minute schedule.
          </p>
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold text-[#F8FAFC] tabular-nums">10</p>
          <p className="mt-1 text-sm font-medium text-[#CBD5E1]">Scientific Disciplines</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            From exoplanet spectroscopy and black holes to cosmology and active space missions.
          </p>
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold text-[#F8FAFC] tabular-nums">100%</p>
          <p className="mt-1 text-sm font-medium text-[#CBD5E1]">Transparent Attribution</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Every article links directly to its original publisher with full source credit and publication timestamps.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onNavigate('/editorial-policy')}
          className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3B82F6] transition-colors cursor-pointer"
        >
          Read Editorial Policy
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/disclaimer')}
          className="rounded-full border border-[#1E293B] bg-[#0D121E] px-5 py-2.5 text-sm font-medium text-[#E2E8F0] hover:border-[#334155] hover:bg-[#121A2B] transition-colors cursor-pointer"
        >
          Read Disclaimer
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/contact')}
          className="rounded-full border border-[#1E293B] bg-[#0D121E] px-5 py-2.5 text-sm font-medium text-[#E2E8F0] hover:border-[#334155] hover:bg-[#121A2B] transition-colors cursor-pointer"
        >
          Contact Us
        </button>
      </div>
    </div>
  );
}

export function EditorialPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20 space-y-8">
      <header className="border-b border-[#1E293B] pb-8">
        <p className="text-xs font-mono text-[#60A5FA] tracking-wider">Standards &amp; Ethics</p>
        <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC]">
          Editorial Policy
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
          How {BRAND.name} aggregates and summarizes external scientific and space-news sources, maintains transparent attribution, and verifies astronomical schedules.
        </p>
      </header>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#CBD5E1]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          1. Aggregation &amp; Source Verification
        </h2>
        <p className="text-[#94A3B8]">
          {BRAND.name} aggregates and summarizes space, astronomy, and astrophysics reporting from established external sources, including official RSS and Atom feeds from NASA, ESA, Space.com, Universe Today, Phys.org, and ScienceDaily, as well as the public Spaceflight News API v4 (which also provides ISRO mission coverage). Feeds are checked periodically on a 15-minute schedule. We do not invent headlines, articles, sources, or publication dates; when an upstream source is temporarily unavailable, the status is reported transparently rather than substituted with fabricated news.
        </p>
      </section>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#CBD5E1]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          2. Source Attribution &amp; Links to Original Publishers
        </h2>
        <p className="text-[#94A3B8]">
          We respect publisher copyright and do not reproduce full third-party articles. Each news card displays the original headline, source name, original publication timestamp (when provided by the source), retrieval timestamp, a short permitted excerpt or summary, authorized feed media where available, and a direct outbound link to read the complete report on the original publisher’s website.
        </p>
      </section>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#CBD5E1]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          3. Astronomical Ephemerides &amp; Corrections
        </h2>
        <p className="text-[#94A3B8]">
          Eclipse timings, meteor shower peaks, lunar phases, and planetary events listed in the Cosmic Calendar are cross-checked against public references from NASA Goddard, the U.S. Naval Observatory (USNO), and the International Meteor Organization (IMO), with verification links included for each entry. If you spot a factual error, broken attribution link, or technical issue, please contact us at{' '}
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
          >
            {BRAND.contactEmail}
          </a>
          .
        </p>
      </section>
    </div>
  );
}

export function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20 space-y-8">
      <header className="border-b border-[#1E293B] pb-8">
        <p className="text-xs font-mono text-[#60A5FA] tracking-wider">Publication Notice</p>
        <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC]">
          Disclaimer
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
          Important information regarding external publisher ownership, scientific accuracy, and astronomical event schedules on {BRAND.name}.
        </p>
      </header>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          1. Ownership of External Scientific Articles
        </h2>
        <p>
          All external news headlines, excerpts, summaries, photographs, and linked reports aggregated on {BRAND.name} belong to their respective original publishers, space agencies, authors, and copyright holders. {BRAND.name} is an independent publication and news aggregator and is not officially affiliated with, endorsed by, or sponsored by NASA, ESA, ISRO, Space.com, Universe Today, Phys.org, ScienceDaily, or any other third-party organization referenced on this website.
        </p>
        <p>
          Readers should always click through and consult the original publisher’s article or underlying peer-reviewed study for complete context, full reporting, datasets, and authoritative scientific details.
        </p>
      </section>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          2. Informational &amp; Educational Purpose
        </h2>
        <p>
          All content on {BRAND.name} — including aggregated news briefings, NASA Astronomy Picture of the Day features, mission profiles, interactive orbital visualizations, and Cosmic Calendar entries — is provided strictly for general informational and scientific literacy purposes. While we rely on reputable public feeds and ephemeris references, we make no warranty regarding completeness, uninterrupted availability, or real-time accuracy of third-party feeds.
        </p>
      </section>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          3. External Links &amp; Astronomical Schedules
        </h2>
        <p>
          {BRAND.name} contains outbound links to external agency portals, science publications, and ephemeris references. We do not control the content, availability, or policies of external websites. Space launch dates, orbital windows, and local observing visibility are subject to weather, technical updates, and agency schedule revisions; verify time-critical observations with the linked primary agency source.
        </p>
      </section>

      <section className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-6 space-y-2 text-sm text-[#94A3B8]">
        <h2 className="font-serif text-lg font-medium text-[#F8FAFC]">
          Attribution or Rights Inquiries
        </h2>
        <p>
          If you are a publisher or rights holder and wish to request an attribution adjustment or content removal, please contact us directly:
        </p>
        <p className="pt-1 font-medium text-[#F1F5F9]">{BRAND.name}</p>
        <a
          href={`mailto:${BRAND.contactEmail}`}
          className="inline-flex items-center gap-2 text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>{BRAND.contactEmail}</span>
        </a>
      </section>
    </div>
  );
}

export function LegalDocumentPage({ type }: { type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy';

  if (isPrivacy) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20 space-y-8">
        <header className="border-b border-[#1E293B] pb-8">
          <p className="text-xs font-mono text-[#60A5FA] tracking-wider">Legal Notice</p>
          <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC]">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
            This Privacy Policy describes how {BRAND.name} handles information in connection with the actual features operating on this website.
          </p>
        </header>

        <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
          <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
            1. Information Collected
          </h2>
          <p>
            {BRAND.name} does not require user accounts to browse its articles or tools. Information is processed only through the following website features and technical operations:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="font-medium text-[#E2E8F0]">Direct Email Correspondence:</strong>{' '}
              {BRAND.name} does not operate an online contact submission form. If you choose to email our editorial desk directly at{' '}
              <a
                href={`mailto:${BRAND.contactEmail}`}
                className="text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                {BRAND.contactEmail}
              </a>
              , we receive your email address, subject line, and message content solely so we can respond to your inquiry.
            </li>
            <li>
              <strong className="font-medium text-[#E2E8F0]">Server Logs &amp; Technical Request Data:</strong>{' '}
              When you browse the site or call backend API endpoints (such as news feeds or NASA APOD), standard web server and hosting infrastructure may process technical information such as your IP address, requested URL path, timestamp, HTTP status code, and browser user-agent. Our server also temporarily holds IP addresses in memory for short-window rate limiting to prevent abuse of API endpoints.
            </li>
            <li>
              <strong className="font-medium text-[#E2E8F0]">Browser Timezone Formatting:</strong>{' '}
              Your browser’s local timezone is read locally on your device using standard JavaScript <span className="font-mono text-xs text-[#CBD5E1]">Intl</span> APIs solely to display publication times and Cosmic Calendar dates in your local time. This timezone setting is not transmitted to or stored by our server.
            </li>
            <li>
              <strong className="font-medium text-[#E2E8F0]">Cookies &amp; Local Storage:</strong>{' '}
              The {BRAND.name} application code does not set first-party cookies and does not store user data in browser <span className="font-mono text-xs text-[#CBD5E1]">localStorage</span> or <span className="font-mono text-xs text-[#CBD5E1]">sessionStorage</span>. Underlying cloud hosting infrastructure or external third-party websites and embedded media you choose to open (such as external publisher pages or embedded astronomy videos) may set their own technical or third-party cookies under their respective privacy policies.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
          <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
            2. How Information Is Used
          </h2>
          <p>We use the limited information described above strictly to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Respond to direct email inquiries you choose to send to our editorial desk.</li>
            <li>Operate, secure, and maintain website reliability, including API rate limiting.</li>
            <li>Retrieve and display up-to-date space news and NASA Astronomy Picture of the Day content.</li>
          </ul>
          <p>We do not sell personal information to third parties.</p>
        </section>

        <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
          <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
            3. Third-Party Services
          </h2>
          <p>
            Only the following third-party services are genuinely integrated into the operation of {BRAND.name}:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="font-medium text-[#E2E8F0]">Web Hosting Infrastructure:</strong>{' '}
              Hosts and serves the website and API endpoints, processing standard network and server logs needed for delivery and security.
            </li>
            <li>
              <strong className="font-medium text-[#E2E8F0]">Space News &amp; Astronomy APIs / Feeds:</strong>{' '}
              Our server fetches public RSS/Atom feeds and APIs from NASA (including NASA APOD), ESA, Space.com, Universe Today, Phys.org, ScienceDaily, and Spaceflight News API v4. When your browser loads publisher article thumbnails, NASA APOD media, optional embedded YouTube/Vimeo videos, or Google Fonts stylesheets, your browser connects directly to those third-party hosts, which may receive your IP address and browser metadata under their own privacy policies.
            </li>
          </ul>
          <p>
            Clicking outbound links to original news publishers or space agencies takes you to external sites governed by their respective privacy policies.
          </p>
        </section>

        <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
          <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
            4. Data Retention &amp; Security
          </h2>
          <p>
            Direct emails you send to {BRAND.contactEmail} are retained in our editorial email inbox only as long as needed to review and respond to your inquiry. API rate-limit counters are kept only temporarily in server memory and expire automatically.
          </p>
          <p>
            We apply reasonable technical safeguards including input validation, server-side secret management, and encrypted transport (HTTPS) in deployed environments. No method of internet transmission or electronic storage is completely immune to risk, so we encourage sharing only information relevant to your inquiry.
          </p>
          <p>
            You may request access to, correction of, or deletion of any email correspondence or personal details you previously sent to us by emailing{' '}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
            >
              {BRAND.contactEmail}
            </a>
            .
          </p>
        </section>

        <section className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-6 space-y-2 text-sm text-[#94A3B8]">
          <h2 className="font-serif text-lg font-medium text-[#F8FAFC]">
            5. Contact Information
          </h2>
          <p>For privacy questions or data deletion requests, please contact:</p>
          <div className="pt-1 space-y-1">
            <p className="font-medium text-[#F1F5F9]">{BRAND.name}</p>
            <p>
              Email:{' '}
              <a
                href={`mailto:${BRAND.contactEmail}`}
                className="text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                {BRAND.contactEmail}
              </a>
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20 space-y-8">
      <header className="border-b border-[#1E293B] pb-8">
        <p className="text-xs font-mono text-[#60A5FA] tracking-wider">Legal Notice</p>
        <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC]">
          Terms and Conditions
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#94A3B8]">
          Please review these terms governing access to and use of {BRAND.name}.
        </p>
      </header>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          1. Purpose &amp; Acceptance
        </h2>
        <p>
          {BRAND.name} provides aggregated space and astronomy news briefings, NASA Astronomy Picture of the Day features, and astronomical ephemeris calendars for informational and educational purposes. By accessing or using this website, you agree to these Terms and Conditions.
        </p>
      </section>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          2. Third-Party Content &amp; Intellectual Property
        </h2>
        <p>
          All aggregated headlines, excerpts, summaries, and authorized feed thumbnails remain the intellectual property of their respective original publishers, authors, and space agencies. NASA Astronomy Picture of the Day photographs may carry individual astrophotographer copyrights as credited beneath each image. {BRAND.name} provides source attribution and direct links to the original publishers and does not grant rights over third-party material.
        </p>
      </section>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          3. Acceptable Use
        </h2>
        <p>
          You agree not to misuse the website or its backend endpoints, including bypassing rate limits, interfering with server operation, or attempting unauthorized access to infrastructure.
        </p>
      </section>

      <section className="space-y-3 text-[15px] leading-relaxed text-[#94A3B8]">
        <h2 className="font-serif text-2xl font-medium text-[#F8FAFC]">
          4. Accuracy, External Links &amp; Limitations
        </h2>
        <p>
          While we source news from recognized space agencies and science publications, {BRAND.name} is provided on an “as is” and “as available” basis. Launch schedules, astronomical visibility windows, and external third-party links may change without notice. Always consult primary scientific sources and original publishers for authoritative information.
        </p>
      </section>

      <section className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-6 space-y-2 text-sm text-[#94A3B8]">
        <h2 className="font-serif text-lg font-medium text-[#F8FAFC]">
          5. Contact Information
        </h2>
        <p>Questions regarding these Terms and Conditions may be directed to:</p>
        <div className="pt-1 space-y-1">
          <p className="font-medium text-[#F1F5F9]">{BRAND.name}</p>
          <p>
            Email:{' '}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
            >
              {BRAND.contactEmail}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
