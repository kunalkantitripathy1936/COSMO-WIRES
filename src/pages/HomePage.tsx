import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Compass,
  Sparkles,
} from 'lucide-react';
import { BRAND } from '../config/brand';
import {
  ApodData,
  Article,
  CosmicEvent,
  EDITORIAL_DESKS,
  EditorialDesk,
  FeedHealth,
  FeedStatus,
  NewsCategory,
  RoutePath,
} from '../types';
import { CATEGORY_METADATA } from '../data/editorialData';
import { GENERATED_IMAGES } from '../utils/mediaAssets';
import {
  filterAndSearchArticles,
  formatDateTimeLocal,
  formatUtcTimestamp,
} from '../utils/newsLogic';
import { ArticleCard, ArticleCardSkeleton } from '../components/ArticleCard';
import { DailyCosmicImage } from '../components/DailyCosmicImage';
import { LiveFeedStatusBar } from '../components/LiveFeedStatusBar';
import { ResilientImage } from '../components/ResilientImage';
import { SectionHeader } from '../components/SectionHeader';
import {
  OrbitalAccent,
  ParallaxFrame,
  Reveal,
  StaggerGrid,
  StaggerItem,
  TiltCard,
} from '../components/motion/CosmicPrimitives';
import { HeroCelestialBackdrop } from '../components/three/HeroCelestialBackdrop';
import { SolarSystemOrrery } from '../components/three/SolarSystemOrrery';

interface HomePageProps {
  articles: Article[];
  loadingNews: boolean;
  refreshingNews: boolean;
  newsError: string | null;
  newArticlesBanner?: string | null;
  feedStatus: FeedStatus;
  isStale: boolean;
  lastUpdated: string;
  nextRefreshAt?: string;
  refreshIntervalMs: number;
  feedHealth: FeedHealth[];
  apod: ApodData | null;
  loadingApod: boolean;
  apodError: string | null;
  upcomingEvents: CosmicEvent[];
  onNavigate: (path: RoutePath) => void;
  onSelectCategory: (category: NewsCategory) => void;
  onExplainArticle: (article: Article) => void;
  onOpenExplainer: () => void;
  onSelectApodDate: (dateStr: string) => void;
  onRefreshNews: () => void;
}

const HERO_EASE = [0.19, 1, 0.22, 1] as const;

export function HomePage({
  articles,
  loadingNews,
  refreshingNews,
  newsError,
  newArticlesBanner,
  feedStatus,
  isStale,
  lastUpdated,
  nextRefreshAt,
  refreshIntervalMs,
  feedHealth,
  apod,
  loadingApod,
  apodError,
  upcomingEvents,
  onNavigate,
  onSelectCategory,
  onExplainArticle,
  onOpenExplainer,
  onSelectApodDate,
  onRefreshNews,
}: HomePageProps) {
  const heroSectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const [activeHomeDesk, setActiveHomeDesk] = useState<EditorialDesk | 'All'>('All');

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start'],
  });
  const nebulaY = useTransform(heroScroll, [0, 1], ['0%', '14%']);

  const heroFeature =
    articles.find(
      (a) =>
        !/on this day in space|this week in space podcast/i.test(a.title) &&
        ['NASA', 'ESA', 'ScienceDaily', 'Phys.org', 'Universe Today'].includes(a.publisher)
    ) ?? articles[0];

  const remainingArticles = useMemo(
    () => (heroFeature ? articles.filter((a) => a.id !== heroFeature.id) : articles),
    [articles, heroFeature]
  );

  const filteredBreakingPool = useMemo(() => {
    const base = activeHomeDesk === 'All' ? remainingArticles : articles;
    return filterAndSearchArticles(base, {
      desk: activeHomeDesk,
      sort: 'newest',
    });
  }, [activeHomeDesk, articles, remainingArticles]);

  const isRecurringFiller = (title: string) =>
    /on this day in space|this week in space podcast/i.test(title);

  const leadBreaking =
    filteredBreakingPool.find(
      (a) => !isRecurringFiller(a.title) && Boolean(a.imageUrl)
    ) ?? filteredBreakingPool[0];

  const latestGrid = filteredBreakingPool
    .filter((a) => a.id !== leadBreaking?.id)
    .sort((a, b) => Number(isRecurringFiller(a.title)) - Number(isRecurringFiller(b.title)))
    .slice(0, 6);

  const discoveryPool = remainingArticles.filter((a) =>
    ['Astrophysics', 'Black Holes', 'Cosmology', 'Exoplanets', 'Galaxies'].includes(a.category)
  );
  const featuredDiscoveries = (discoveryPool.length >= 3 ? discoveryPool : remainingArticles).slice(
    0,
    4
  );

  const heroPublishedValid = Boolean(
    heroFeature?.publishedAt && Date.parse(heroFeature.publishedAt) > 0
  );

  return (
    <div>
      {/* HERO SECTION */}
      <section
        ref={heroSectionRef}
        className="relative overflow-hidden border-b border-[#1E293B]"
      >
        {/* Layered Deep-Space Nebula + Animated Starfield + Interactive 3D Celestial Sphere */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            style={prefersReduced ? undefined : { y: nebulaY }}
            className="absolute -inset-y-8 inset-x-0"
          >
            <img
              src={GENERATED_IMAGES.nebula}
              alt="Deep-space star-forming nebula backdrop"
              className="h-full w-full object-cover object-center opacity-35"
            />
          </motion.div>

          {/* 3D Rotating Celestial Sphere, Atmospheric Glow, Rings, Moon & Telemetry Probe */}
          <HeroCelestialBackdrop />

          {/* Targeted editorial contrast scrim: preserves open upper 3D celestial sky on mobile while keeping desktop unchanged */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#07090E]/24 via-[#07090E]/62 to-[#07090E] lg:bg-gradient-to-r lg:from-[#07090E]/92 lg:via-[#07090E]/36 lg:to-[#07090E]/28" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-transparent to-[#07090E]/28" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1360px] px-4 pt-20 pb-14 sm:px-6 sm:pt-24 sm:pb-16 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-9 lg:gap-12 items-stretch">
            {/* Editorial Headline Column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.04, ease: HERO_EASE }}
                className="text-[11px] sm:text-xs font-mono tracking-[0.18em] text-[#60A5FA]"
              >
                {BRAND.tagline}
              </motion.p>

              <motion.h1
                initial={prefersReduced ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.56, delay: 0.1, ease: HERO_EASE }}
                className="mt-3.5 sm:mt-4 font-serif text-[2.25rem] sm:text-5xl lg:text-[3.5rem] font-medium leading-[1.08] tracking-[-0.015em] text-[#F8FAFC] max-w-2xl drop-shadow-[0_2px_16px_rgba(7,9,14,0.65)] lg:drop-shadow-none"
              >
                The Universe Is Always Writing New Stories.
              </motion.h1>

              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.54, delay: 0.18, ease: HERO_EASE }}
                className="mt-4 sm:mt-5 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-[#CBD5E1]"
              >
                {BRAND.name} is an independent digital science publication delivering verified breaking dispatches from NASA, ESA, ISRO, and leading astronomy desks — paired with peer-grounded scientific explanations and astronomical ephemerides.
              </motion.p>

              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.52, delay: 0.25, ease: HERO_EASE }}
                className="mt-7 sm:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-3.5"
              >
                <button
                  type="button"
                  onClick={() => onNavigate('/latest-news')}
                  className="group inline-flex h-12 items-center justify-between sm:justify-start gap-2.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] pl-6 pr-3 text-sm font-medium text-white shadow-[0_10px_28px_rgba(37,99,235,0.38)] hover:from-[#3B82F6] hover:to-[#4F46E5] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap cursor-pointer"
                >
                  <span>Explore Latest Dispatches</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onOpenExplainer}
                  className="inline-flex h-12 items-center justify-center sm:justify-start gap-2.5 rounded-full border border-[#334155]/90 bg-[#0D121E]/92 lg:bg-[#0D121E]/85 lg:backdrop-blur-md pl-3 pr-5 text-sm font-medium text-[#E2E8F0] shadow-[0_6px_22px_rgba(139,92,246,0.14)] hover:border-[#8B5CF6]/70 hover:bg-[#131A2D] hover:text-white hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 whitespace-nowrap cursor-pointer"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#8B5CF6]/18 text-[#C4B5FD]">
                    <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>Ask Cosmic Explainer</span>
                </button>
              </motion.div>
            </div>

            {/* Featured Hero Dispatch Card */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.62, delay: 0.2, ease: HERO_EASE }}
              className="lg:col-span-5 flex"
            >
              {heroFeature ? (
                <TiltCard maxTiltDeg={3} className="w-full">
                  <article className="group flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/94 lg:bg-[#0D121E]/90 lg:backdrop-blur-md p-3 transition-[border-color,box-shadow] duration-300 hover:border-[#3B82F6]/50 hover:shadow-[0_22px_50px_rgba(3,7,18,0.72)]">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-[#090D16]">
                      <ResilientImage
                        src={heroFeature.imageUrl}
                        alt={heroFeature.imageAlt || heroFeature.title}
                        category={heroFeature.category}
                        loading="eager"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D121E]/70 via-transparent to-transparent" />
                    </div>

                    <div className="flex flex-1 flex-col justify-between px-3 pb-2.5 pt-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A3B8]">
                          <span className="font-medium text-[#60A5FA]">Featured Dispatch</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#CBD5E1]">{heroFeature.publisher}</span>
                          <span aria-hidden="true">·</span>
                          {heroPublishedValid ? (
                            <time
                              dateTime={heroFeature.publishedAt}
                              title={`Published ${formatUtcTimestamp(heroFeature.publishedAt, true)}`}
                              className="font-mono tabular-nums"
                            >
                              Published {formatDateTimeLocal(heroFeature.publishedAt, true)}
                            </time>
                          ) : (
                            <span className="font-mono text-[#64748B]">Date unavailable</span>
                          )}
                          {heroFeature.isSample && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#C4B5FD]">Archive Sample</span>
                            </>
                          )}
                        </div>

                        <h2 className="mt-2.5 font-serif text-xl sm:text-2xl font-medium leading-snug text-[#F8FAFC]">
                          <a
                            href={heroFeature.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#93C5FD] transition-colors"
                          >
                            {heroFeature.title}
                          </a>
                        </h2>

                        <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8] line-clamp-3">
                          {heroFeature.excerpt}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-2.5 border-t border-[#1E293B]/80 pt-3.5 text-xs font-medium">
                        <a
                          href={heroFeature.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[40px] sm:min-h-0 items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#07090E]/85 pl-3.5 pr-2 py-1.5 text-[#F1F5F9] hover:border-[#3B82F6]/60 hover:text-white active:scale-[0.97] transition-[border-color,color,transform] duration-150"
                        >
                          <span>Read Article</span>
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#131D33] text-[#60A5FA]">
                            <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                          </span>
                        </a>
                        <button
                          type="button"
                          onClick={() => onExplainArticle(heroFeature)}
                          className="inline-flex min-h-[40px] sm:min-h-0 items-center gap-1.5 rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-3.5 py-1.5 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 hover:text-white active:scale-[0.97] transition-[background-color,color,transform] duration-150 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                          <span>Explain Science</span>
                        </button>
                      </div>
                    </div>
                  </article>
                </TiltCard>
              ) : (
                <div className="w-full">
                  <ArticleCardSkeleton />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* BREAKING & LATEST NEWS */}
      <section id="latest-news" aria-labelledby="latest-news-heading" className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeader
              id="latest-news-heading"
              kicker={
                feedStatus === 'sample-fallback'
                  ? 'Offline Archive Sample · External Feeds Unreachable'
                  : 'Verified Science Wire · NASA, ESA, ISRO Coverage, Space.com, Universe Today, Phys.org & ScienceDaily'
              }
              title="Breaking & Latest Space News"
              actionLabel="All Dispatches & Desks"
              onAction={() => onNavigate('/latest-news')}
            />
          </Reveal>

          <Reveal delay={0.03} className="mt-5">
            <LiveFeedStatusBar
              feedStatus={feedStatus}
              isStale={isStale}
              lastUpdated={lastUpdated}
              nextRefreshAt={nextRefreshAt}
              refreshIntervalMs={refreshIntervalMs}
              feedHealth={feedHealth}
              initialLoading={loadingNews && articles.length === 0}
              refreshing={refreshingNews}
              errorMessage={newsError}
              newArticlesBanner={newArticlesBanner}
              compact
              onRefresh={onRefreshNews}
            />
          </Reveal>

          {/* Animated Rounded Category Quick-Filter Bar */}
          <Reveal delay={0.05} className="mt-5">
            <div
              role="group"
              aria-label="Filter latest space news by category"
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5"
            >
              {(['All', ...EDITORIAL_DESKS] as const).map((deskOption) => {
                const active = activeHomeDesk === deskOption;
                return (
                  <button
                    key={deskOption}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveHomeDesk(deskOption)}
                    className={`relative min-h-[40px] sm:min-h-0 rounded-full px-4 py-2 text-xs font-medium transition-[color,border-color,transform] duration-150 active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'text-white'
                        : 'border border-[#1E293B] bg-[#0D121E]/85 text-[#94A3B8] hover:border-[#3B82F6]/45 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={prefersReduced ? undefined : 'home-desk-pill'}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] shadow-[0_4px_16px_rgba(37,99,235,0.32)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">
                      {deskOption === 'All' ? 'All Dispatches' : deskOption}
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {loadingNews && articles.length === 0 ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <ArticleCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredBreakingPool.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#1E293B] bg-[#0D121E]/85 p-10 text-center">
              <p className="font-serif text-xl text-[#F1F5F9]">
                No recent dispatches in {activeHomeDesk} right now
              </p>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Check another category above or refresh feeds to check for newly published updates.
              </p>
              <button
                type="button"
                onClick={() => setActiveHomeDesk('All')}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#2563EB] px-5 text-xs font-medium text-white hover:bg-[#3B82F6] transition-colors cursor-pointer"
              >
                Show All Dispatches
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {leadBreaking && (
                <Reveal delay={0.05} key={`lead-${leadBreaking.id}`}>
                  <ArticleCard
                    article={leadBreaking}
                    variant="lead"
                    onExplain={onExplainArticle}
                    onSelectCategory={onSelectCategory}
                  />
                </Reveal>
              )}

              <StaggerGrid
                key={`home-grid-${activeHomeDesk}`}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {latestGrid.map((article) => (
                  <StaggerItem key={article.id} className="h-full">
                    <ArticleCard
                      article={article}
                      onExplain={onExplainArticle}
                      onSelectCategory={onSelectCategory}
                    />
                  </StaggerItem>
                ))}
              </StaggerGrid>
            </div>
          )}
        </div>
      </section>

      {/* FEATURED SCIENTIFIC DISCOVERIES */}
      <section
        aria-labelledby="featured-discoveries-heading"
        className="relative overflow-hidden border-t border-[#1E293B] bg-[#0A0E18] py-16 lg:py-20"
      >
        <OrbitalAccent variant="violet" position="top-right" />

        <div className="relative z-10 mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeader
              id="featured-discoveries-heading"
              kicker="Research & Breakthrough Desk"
              title="Featured Discoveries"
              accent="violet"
              actionLabel="Explore Discoveries Desk"
              onAction={() => onNavigate('/discoveries')}
            />
          </Reveal>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Editorial Visual Feature */}
            <Reveal delay={0.06} className="lg:col-span-5">
              <TiltCard maxTiltDeg={3}>
                <div className="group overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 backdrop-blur-sm p-3 transition-[border-color,box-shadow] duration-300 hover:border-[#8B5CF6]/50 hover:shadow-[0_20px_46px_rgba(3,7,18,0.65)]">
                  <ParallaxFrame offsetPx={14} className="aspect-[4/3] rounded-xl">
                    <img
                      src={GENERATED_IMAGES.blackhole}
                      alt="Relativistic black hole accretion disk visualization"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                    />
                  </ParallaxFrame>
                  <div className="p-4 pt-5">
                    <p className="text-xs font-mono text-[#A78BFA]">
                      Astrophysics &amp; Cosmology Spotlight
                    </p>
                    <h3 className="mt-2 font-serif text-2xl font-medium text-[#F1F5F9]">
                      Translating Complex Observatory Findings Into Clear Physics
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                      Every research dispatch indexed by {BRAND.name} can be analyzed on demand with Cosmic Explainer — clarifying spectroscopy, redshift, orbital dynamics, and dark-sector cosmology without sacrificing scientific accuracy.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenExplainer}
                      className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/50 bg-[#8B5CF6]/12 pl-3 pr-4 py-2 text-xs font-medium text-[#DDD6FE] hover:bg-[#8B5CF6]/24 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6]/25">
                        <Sparkles className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span>Open Cosmic Explainer</span>
                    </button>
                  </div>
                </div>
              </TiltCard>
            </Reveal>

            {/* Compact Scientific Discovery Ledger */}
            <Reveal delay={0.12} className="lg:col-span-7">
              <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 backdrop-blur-sm px-6 py-3">
                {featuredDiscoveries.map((article) => (
                  <ArticleCard
                    key={`disc-${article.id}`}
                    article={article}
                    variant="compact"
                    onExplain={onExplainArticle}
                    onSelectCategory={onSelectCategory}
                  />
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* DAILY COSMIC IMAGE (NASA APOD) */}
      <DailyCosmicImage
        apod={apod}
        loading={loadingApod}
        error={apodError}
        onSelectDate={onSelectApodDate}
        onExplainApod={onExplainArticle}
      />

      {/* EXPLORE CATEGORIES */}
      <section
        aria-labelledby="explore-categories-heading"
        className="relative overflow-hidden border-t border-[#1E293B] bg-[#0A0E18] py-16 lg:py-20"
      >
        <OrbitalAccent variant="blue" position="bottom-left" />

        <div className="relative z-10 mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeader
              id="explore-categories-heading"
              kicker="Subject Taxonomy"
              title="Explore Categories"
            />
          </Reveal>

          <StaggerGrid
            stagger={0.04}
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {CATEGORY_METADATA.map((cat) => (
              <StaggerItem key={cat.name}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.name)}
                  className="group relative flex min-h-[168px] sm:min-h-[184px] w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E] p-5 text-left transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[#3B82F6]/65 hover:shadow-[0_16px_34px_rgba(3,7,18,0.62)] active:scale-[0.985] active:border-[#3B82F6]/70 cursor-pointer"
                >
                  <img
                    src={GENERATED_IMAGES[cat.imageKey]}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-30 transition-transform duration-700 ease-out group-hover:scale-105 group-hover:opacity-45"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/75 to-[#07090E]/25" />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#3B82F6]/30 bg-[#0D121E]/80 text-[#60A5FA] group-hover:border-[#3B82F6]/70 group-hover:bg-[#2563EB]/25 transition-colors">
                      <Compass className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-[#64748B] group-hover:text-[#93C5FD] transition-colors"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="relative z-10 pt-6">
                    <p className="text-[11px] font-mono text-[#60A5FA]">{cat.subtitle}</p>
                    <h3 className="mt-1 font-serif text-lg font-medium text-[#F8FAFC] group-hover:text-white">
                      {cat.name}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8] line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                </button>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* COSMIC CALENDAR PREVIEW & INTERACTIVE 3D ORBITAL ATLAS */}
      <section
        aria-labelledby="cosmic-calendar-preview-heading"
        className="border-t border-[#1E293B] py-16 lg:py-20"
      >
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeader
              id="cosmic-calendar-preview-heading"
              kicker="Verified Astronomical Ephemerides · Local Timezone"
              title="Cosmic Calendar Preview"
              actionLabel="Full 2026–2027 Calendar"
              onAction={() => onNavigate('/cosmic-calendar')}
            />
          </Reveal>

          <Reveal delay={0.06} className="mt-8">
            <SolarSystemOrrery />
          </Reveal>

          <StaggerGrid className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {upcomingEvents.slice(0, 4).map((event) => (
              <StaggerItem key={event.id} className="h-full">
                <article className="flex h-full flex-col justify-between rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-5 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[#3B82F6]/45 hover:shadow-[0_14px_30px_rgba(3,7,18,0.55)]">
                  <div>
                    <div className="flex items-center gap-2.5 text-xs font-mono text-[#60A5FA]">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/12 shrink-0">
                        <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span>{event.type}</span>
                    </div>

                    <h3 className="mt-3.5 font-serif text-lg font-medium leading-snug text-[#F1F5F9]">
                      {event.title}
                    </h3>

                    <p className="mt-2 text-xs font-mono text-[#CBD5E1] tabular-nums">
                      {formatDateTimeLocal(event.utcDate, event.datePrecision === 'exact-utc')}
                    </p>
                    <p className="mt-0.5 text-[11px] font-mono text-[#64748B] tabular-nums">
                      {formatUtcTimestamp(event.utcDate, event.datePrecision === 'exact-utc')}
                    </p>

                    <p className="mt-3 text-xs leading-relaxed text-[#94A3B8] line-clamp-3">
                      {event.description}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[#1E293B]/80 pt-3 text-xs text-[#64748B]">
                    Source: {event.sourceReference}
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>
    </div>
  );
}
