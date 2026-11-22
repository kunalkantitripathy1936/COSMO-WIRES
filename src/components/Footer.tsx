import { ArrowUpRight, Mail } from 'lucide-react';
import { BRAND } from '../config/brand';
import { RoutePath } from '../types';
import { BrandMark } from './BrandMark';

interface FooterProps {
  onNavigate: (path: RoutePath) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: RoutePath) => {
    e.preventDefault();
    onNavigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[#1E293B] bg-[#05070B] text-[#94A3B8]">
      <div className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <a
              href="/"
              onClick={(e) => handleLink(e, '/')}
              className="inline-flex text-[#F1F5F9] hover:text-white transition-colors"
            >
              <BrandMark size="sm" />
            </a>
            <p className="text-xs font-mono tracking-wider text-[#60A5FA]">
              {BRAND.tagline}
            </p>
            <p className="text-sm leading-relaxed text-[#94A3B8] max-w-sm">
              An international digital science publication curating verified news, research breakthroughs, and astronomical ephemerides from leading space agencies and science journals.
            </p>
            <div className="pt-1">
              <a
                href={`mailto:${BRAND.contactEmail}`}
                className="inline-flex items-center gap-2 text-xs font-medium text-[#CBD5E1] hover:text-[#60A5FA] transition-colors"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#1E293B] bg-[#0D121E] text-[#60A5FA]">
                  <Mail className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>{BRAND.contactEmail}</span>
              </a>
            </div>
          </div>

          {/* Editorial Sections */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
              Editorial Desks
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Latest News', path: '/latest-news' as RoutePath },
                { label: 'Astronomy', path: '/astronomy' as RoutePath },
                { label: 'Astrophysics', path: '/astrophysics' as RoutePath },
                { label: 'Space Missions', path: '/space-missions' as RoutePath },
                { label: 'Scientific Discoveries', path: '/discoveries' as RoutePath },
                { label: 'Cosmic Calendar', path: '/cosmic-calendar' as RoutePath },
              ].map((item) => (
                <li key={item.path}>
                  <a
                    href={item.path}
                    onClick={(e) => handleLink(e, item.path)}
                    className="hover:text-[#F1F5F9] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Institutional & Legal Links */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
              Publication
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: `About ${BRAND.name}`, path: '/about' as RoutePath },
                { label: 'Contact Us', path: '/contact' as RoutePath },
                { label: 'Editorial Policy', path: '/editorial-policy' as RoutePath },
                { label: 'Disclaimer', path: '/disclaimer' as RoutePath },
                { label: 'Privacy Policy', path: '/privacy' as RoutePath },
                { label: 'Terms and Conditions', path: '/terms' as RoutePath },
              ].map((item) => (
                <li key={item.path}>
                  <a
                    href={item.path}
                    onClick={(e) => handleLink(e, item.path)}
                    className="hover:text-[#F1F5F9] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Primary Agency Portals & Directory */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
              Primary Sources
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'NASA Portal', href: 'https://www.nasa.gov/' },
                { label: 'ESA Science', href: 'https://www.esa.int/' },
                { label: 'ISRO Missions', href: 'https://www.isro.gov.in/' },
              ].map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#F1F5F9] transition-colors"
                  >
                    <span>{source.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#64748B]" strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/sitemap.xml"
                  className="hover:text-[#F1F5F9] transition-colors"
                >
                  XML Sitemap
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[#1E293B] pt-6 text-xs text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Headlines and permitted excerpts remain the copyright of their respective original publishers.
          </p>
          <p className="font-mono">Digital Science Edition · Global UTC</p>
        </div>
      </div>
    </footer>
  );
}
