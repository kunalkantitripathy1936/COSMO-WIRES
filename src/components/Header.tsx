import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronRight, Menu, Search, Sparkles, X } from 'lucide-react';
import { BRAND } from '../config/brand';
import { RoutePath } from '../types';
import { BrandMark } from './BrandMark';

interface HeaderProps {
  currentPath: RoutePath | 'not-found';
  onNavigate: (path: RoutePath) => void;
  onOpenSearch: () => void;
  onOpenExplainer: () => void;
}

const NAV_ITEMS: Array<{ label: string; path: RoutePath }> = [
  { label: 'Home', path: '/' },
  { label: 'Latest News', path: '/latest-news' },
  { label: 'Astronomy', path: '/astronomy' },
  { label: 'Astrophysics', path: '/astrophysics' },
  { label: 'Space Missions', path: '/space-missions' },
  { label: 'Discoveries', path: '/discoveries' },
  { label: 'Cosmic Calendar', path: '/cosmic-calendar' },
  { label: 'Contact Us', path: '/contact' },
];

export function Header({
  currentPath,
  onNavigate,
  onOpenSearch,
  onOpenExplainer,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [mobileMenuOpen]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: RoutePath) => {
    e.preventDefault();
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 h-16 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled || mobileMenuOpen
          ? 'border-[#26344B]/90 bg-[#07090E]/92 shadow-[0_10px_32px_rgba(0,0,0,0.48)]'
          : 'border-[#1E293B]/80 bg-[#07090E]/82'
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between gap-3 xl:gap-6 px-4 sm:px-6 xl:px-8">
        {/* Zone 1: Brand Wordmark & Circular Emblem */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="text-[#F1F5F9] hover:text-white transition-colors"
          aria-label={`${BRAND.name} Home`}
        >
          <BrandMark />
        </a>

        {/* Zone 2: Primary Editorial Navigation (Desktop & Landscape Tablet 1024px+) */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex h-full items-center gap-2.5 xl:gap-5"
        >
          {NAV_ITEMS.map((item) => {
            const active = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-full items-center text-xs xl:text-sm font-medium whitespace-nowrap shrink-0 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2.5px] after:rounded-full after:transition-transform after:duration-200 ${
                  active
                    ? 'text-white after:scale-x-100 after:bg-gradient-to-r after:from-[#3B82F6] after:to-[#8B5CF6]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] after:scale-x-0 hover:after:scale-x-100 after:bg-[#3B82F6]/50'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Circular Search & Rounded Cosmic Explainer Action */}
        <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search articles and topics"
            className="inline-flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#1E293B] bg-[#0D121E]/90 text-[#CBD5E1] hover:border-[#3B82F6]/60 hover:bg-[#131C30] hover:text-white active:scale-[0.95] transition-all duration-200 cursor-pointer"
          >
            <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenExplainer}
            className="hidden sm:inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] pl-2.5 pr-4 text-xs xl:text-sm font-medium text-white shadow-[0_6px_20px_rgba(37,99,235,0.28)] hover:from-[#3B82F6] hover:to-[#4F46E5] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span>
              <span className="lg:hidden xl:inline">Cosmic </span>Explainer
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`inline-flex lg:hidden h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-200 active:scale-[0.95] cursor-pointer ${
              mobileMenuOpen
                ? 'border-[#3B82F6]/70 bg-[#131C30] text-white'
                : 'border-[#1E293B] bg-[#0D121E]/90 text-[#CBD5E1] hover:border-[#3B82F6]/60 hover:text-white'
            }`}
          >
            {mobileMenuOpen ? (
              <X className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Animated Glassmorphic Mobile & Portrait Tablet Drawer (< 1024px) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="mobile-nav-backdrop"
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
              className="fixed inset-x-0 top-16 bottom-0 z-30 bg-black/65 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              id="mobile-nav-drawer"
              key="mobile-nav-panel"
              initial={prefersReduced ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-40 lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-[#26344B] bg-[#090D16] px-4 py-4 shadow-[0_24px_54px_rgba(0,0,0,0.85)]"
            >
              <nav aria-label="Mobile navigation" className="flex flex-col space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const active = currentPath === item.path;
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(e) => handleLinkClick(e, item.path)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[46px] items-center justify-between rounded-xl px-4 py-2.5 text-[15px] font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985] ${
                        active
                          ? 'bg-gradient-to-r from-[#131F36] to-[#11192B] text-white border border-[#3B82F6]/45 shadow-[0_4px_16px_rgba(37,99,235,0.16)]'
                          : 'border border-transparent text-[#CBD5E1] hover:bg-[#0D121E] hover:text-white'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight
                        className={`h-4 w-4 ${active ? 'text-[#60A5FA]' : 'text-[#475569]'}`}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </a>
                  );
                })}

                <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-[#1E293B] text-xs font-medium">
                  {(
                    [
                      { label: 'About', path: '/about' },
                      { label: 'Policy', path: '/editorial-policy' },
                      { label: 'Privacy', path: '/privacy' },
                    ] as const
                  ).map((item) => (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(e) => handleLinkClick(e, item.path)}
                      className="flex min-h-[42px] items-center justify-center rounded-full border border-[#1E293B]/90 bg-[#0D121E] px-2.5 py-2 text-center text-[#94A3B8] hover:border-[#3B82F6]/40 hover:text-white active:scale-[0.97] transition-all"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>

                <div className="pt-3 mt-1 border-t border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenExplainer();
                    }}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(37,99,235,0.34)] hover:from-[#3B82F6] hover:to-[#4F46E5] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>Open Cosmic Explainer</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
