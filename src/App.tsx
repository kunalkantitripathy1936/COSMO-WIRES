import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BRAND } from './config/brand';
import { apiUrl, parseJsonResponse } from './config/api';
import {
  ApodData,
  Article,
  FeedHealth,
  FeedStatus,
  NewsApiResponse,
  NewsCategory,
  RoutePath,
} from './types';
import { VERIFIED_COSMIC_EVENTS } from './data/cosmicCalendar';
import { filterCosmicEvents } from './utils/newsLogic';
import { GENERATED_IMAGES } from './utils/mediaAssets';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileCosmicAtmosphere, ScrollProgressBar } from './components/motion/CosmicPrimitives';
import { HomePage } from './pages/HomePage';

const LatestNewsPage = lazy(() =>
  import('./pages/LatestNewsPage').then((m) => ({ default: m.LatestNewsPage }))
);
const TopicSectionPage = lazy(() =>
  import('./pages/TopicSectionPage').then((m) => ({ default: m.TopicSectionPage }))
);
const SpaceMissionsPage = lazy(() =>
  import('./pages/SpaceMissionsPage').then((m) => ({ default: m.SpaceMissionsPage }))
);
const CosmicCalendarPage = lazy(() =>
  import('./pages/CosmicCalendarPage').then((m) => ({ default: m.CosmicCalendarPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const AboutPage = lazy(() =>
  import('./pages/InstitutionalPages').then((m) => ({ default: m.AboutPage }))
);
const DisclaimerPage = lazy(() =>
  import('./pages/InstitutionalPages').then((m) => ({ default: m.DisclaimerPage }))
);
const EditorialPolicyPage = lazy(() =>
  import('./pages/InstitutionalPages').then((m) => ({ default: m.EditorialPolicyPage }))
);
const LegalDocumentPage = lazy(() =>
  import('./pages/InstitutionalPages').then((m) => ({ default: m.LegalDocumentPage }))
);
const SearchModal = lazy(() =>
  import('./components/SearchModal').then((m) => ({ default: m.SearchModal }))
);
const CosmicExplainerDrawer = lazy(() =>
  import('./components/CosmicExplainerDrawer').then((m) => ({
    default: m.CosmicExplainerDrawer,
  }))
);

const VALID_ROUTES = new Set<RoutePath>([
  '/',
  '/latest-news',
  '/astronomy',
  '/astrophysics',
  '/space-missions',
  '/discoveries',
  '/cosmic-calendar',
  '/about',
  '/contact',
  '/editorial-policy',
  '/disclaimer',
  '/privacy',
  '/terms',
]);

const PAGE_SEO: Record<RoutePath, { title: string; description: string }> = {
  '/': {
    title: `${BRAND.name} — Space, Astronomy & Astrophysics News`,
    description: `${BRAND.taglineSentenceCase} Verified space news, NASA APOD, astrophysics discoveries, and astronomical calendars.`,
  },
  '/latest-news': {
    title: `Latest Space & Astronomy News — ${BRAND.name}`,
    description:
      'Live aggregated news from NASA, ESA, ISRO, Space.com, Universe Today, Phys.org, and ScienceDaily with category and publisher filters.',
  },
  '/astronomy': {
    title: `Astronomy Desk — ${BRAND.name}`,
    description:
      'Observational astronomy, exoplanets, solar system planetary science, and deep-sky galaxy imaging.',
  },
  '/astrophysics': {
    title: `Astrophysics & Cosmology — ${BRAND.name}`,
    description:
      'Black holes, dark matter, dark energy, gravitational waves, neutron stars, and high-energy cosmic phenomena.',
  },
  '/space-missions': {
    title: `Space Missions & Deep-Space Fleet — ${BRAND.name}`,
    description:
      'Active robotic observatories, planetary probes, propulsion engineering, and crewed space exploration dispatches.',
  },
  '/discoveries': {
    title: `Scientific Discoveries — ${BRAND.name}`,
    description:
      'Landmark peer-reviewed discoveries in astronomy, astrophysics, and planetary science with AI-assisted explanations.',
  },
  '/cosmic-calendar': {
    title: `Cosmic Calendar (2026–2027) — ${BRAND.name}`,
    description:
      'Verified solar and lunar eclipses, meteor showers, planetary oppositions, and moon phases converted to your local timezone.',
  },
  '/about': {
    title: `About ${BRAND.name} — ${BRAND.taglineTitleCase.replace(/\.$/, '')}`,
    description: `Learn about ${BRAND.name}, our scientific editorial standards, and verified international news syndication.`,
  },
  '/contact': {
    title: `Contact Us — ${BRAND.name}`,
    description: `Get in touch with ${BRAND.name} for questions, suggestions, collaboration ideas, or feedback.`,
  },
  '/editorial-policy': {
    title: `Editorial Policy — ${BRAND.name}`,
    description: `Source verification, copyright attribution, and transparent AI labeling standards at ${BRAND.name}.`,
  },
  '/disclaimer': {
    title: `Disclaimer — ${BRAND.name}`,
    description: `Publisher ownership, external source attribution, and informational disclaimer for ${BRAND.name}.`,
  },
  '/privacy': {
    title: `Privacy Policy — ${BRAND.name}`,
    description: `How ${BRAND.name} handles Contact Us submissions, technical server data, and third-party services.`,
  },
  '/terms': {
    title: `Terms and Conditions — ${BRAND.name}`,
    description: `Terms of use, publisher attribution, and ephemeris notices for ${BRAND.name}.`,
  },
};

type ActiveRoute = RoutePath | 'not-found';

function parseRouteFromLocation(): ActiveRoute {
  const raw = window.location.pathname.replace(/\/+$/, '') || '/';
  return VALID_ROUTES.has(raw as RoutePath) ? (raw as RoutePath) : 'not-found';
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<ActiveRoute>(() => parseRouteFromLocation());
  const [articles, setArticles] = useState<Article[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);
  const [feedHealth, setFeedHealth] = useState<FeedHealth[]>([]);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('live');
  const [isStale, setIsStale] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [nextRefreshAt, setNextRefreshAt] = useState<string | undefined>(undefined);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState<number>(15 * 60 * 1000);
  const [loadingNews, setLoadingNews] = useState<boolean>(true);
  const [refreshingNews, setRefreshingNews] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newArticlesBanner, setNewArticlesBanner] = useState<string | null>(null);
  const lastClientSyncMsRef = useRef<number>(0);
  const knownArticleIdsRef = useRef<Set<string>>(new Set());

  const [apod, setApod] = useState<ApodData | null>(null);
  const [loadingApod, setLoadingApod] = useState<boolean>(true);
  const [apodError, setApodError] = useState<string | null>(null);

  const [archiveQuery, setArchiveQuery] = useState('');
  const [archiveCategory, setArchiveCategory] = useState<NewsCategory | 'All'>('All');
  const [archiveKey, setArchiveKey] = useState(0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerArticle, setExplainerArticle] = useState<Article | null>(null);

  const fetchNews = useCallback(async (forceRefresh = false, silent = false) => {
    if (!silent) {
      setRefreshingNews(true);
    }
    if (forceRefresh) {
      setNewsError(null);
    }
    try {
      const response = await fetch(
        apiUrl(`/api/news${forceRefresh ? '?refresh=1' : ''}`),
        {
          headers: { Accept: 'application/json' },
          cache: forceRefresh ? 'no-store' : 'default',
        }
      );
      if (!response.ok) {
        throw new Error(`Feed API returned HTTP ${response.status}`);
      }
      const data = await parseJsonResponse<NewsApiResponse>(response, 'News API');
      const prevIds = knownArticleIdsRef.current;
      if (prevIds.size > 0) {
        const newlyAdded = data.articles.filter((a) => !prevIds.has(a.id)).length;
        if (newlyAdded > 0) {
          setNewArticlesBanner(
            `${newlyAdded} new verified space ${newlyAdded === 1 ? 'dispatch' : 'dispatches'} loaded automatically.`
          );
        } else if (forceRefresh) {
          setNewArticlesBanner('News wire checked — you are viewing the latest available dispatches.');
        }
      }
      knownArticleIdsRef.current = new Set(data.articles.map((a) => a.id));

      setArticles(data.articles);
      setPublishers(data.publishers);
      setFeedHealth(data.feedHealth);
      setFeedStatus(data.feedStatus);
      setIsStale(Boolean(data.isStale));
      setLastUpdated(data.lastUpdated);
      setNextRefreshAt(data.nextRefreshAt);
      if (typeof data.refreshIntervalMs === 'number' && data.refreshIntervalMs > 0) {
        setRefreshIntervalMs(data.refreshIntervalMs);
      }
      setNewsError(data.lastError ?? null);
      lastClientSyncMsRef.current = Date.now();
    } catch {
      setIsStale(true);
      setNewsError(
        `Unable to reach the ${BRAND.name} news backend right now. Previously loaded articles remain available below.`
      );
    } finally {
      setLoadingNews(false);
      if (!silent) {
        setRefreshingNews(false);
      }
    }
  }, []);

  const fetchApod = useCallback(async (dateStr?: string) => {
    setLoadingApod(true);
    setApodError(null);
    try {
      const query = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
      const response = await fetch(apiUrl(`/api/apod${query}`), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Could not load NASA APOD.');
      }
      const data = await parseJsonResponse<ApodData>(response, 'NASA APOD API');
      setApod(data);
    } catch {
      setApodError('Unable to load NASA Astronomy Picture of the Day at this moment.');
    } finally {
      setLoadingApod(false);
    }
  }, []);

  useEffect(() => {
    void fetchNews(false);
    void fetchApod();
  }, [fetchNews, fetchApod]);

  useEffect(() => {
    if (!newArticlesBanner) return;
    const timer = window.setTimeout(() => setNewArticlesBanner(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [newArticlesBanner]);

  // Automatic frontend polling synchronized with backend cache window (no manual page reload required)
  useEffect(() => {
    const syncIntervalMs = Math.min(5 * 60 * 1000, Math.max(60_000, Math.round(refreshIntervalMs / 3)));
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchNews(false, true);
      }
    }, syncIntervalMs);

    // Also schedule a targeted check shortly after backend's nextRefreshAt completes
    let scheduledTimer: number | undefined;
    if (nextRefreshAt) {
      const delayMs = Date.parse(nextRefreshAt) - Date.now() + 4000;
      if (delayMs > 5_000 && delayMs <= refreshIntervalMs + 60_000) {
        scheduledTimer = window.setTimeout(() => {
          if (document.visibilityState === 'visible') {
            void fetchNews(false, true);
          }
        }, delayMs);
      }
    }

    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastClientSyncMsRef.current > syncIntervalMs
      ) {
        void fetchNews(false, true);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      if (scheduledTimer !== undefined) window.clearTimeout(scheduledTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNews, nextRefreshAt, refreshIntervalMs]);

  // Browser history synchronization
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(parseRouteFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Global Cmd/Ctrl + K search shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Sync dynamic SEO title, description, and Open Graph / Twitter metadata per route
  useEffect(() => {
    const meta =
      currentPath === 'not-found'
        ? {
            title: `Page Not Found — ${BRAND.name}`,
            description: `The requested ${BRAND.name} dispatch or section could not be located.`,
          }
        : PAGE_SEO[currentPath] ?? PAGE_SEO['/'];
    document.title = meta.title;
    const syncMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };
    syncMeta('meta[name="description"]', meta.description);
    syncMeta('meta[property="og:title"]', meta.title);
    syncMeta('meta[property="og:description"]', meta.description);
    syncMeta('meta[name="twitter:title"]', meta.title);
    syncMeta('meta[name="twitter:description"]', meta.description);
  }, [currentPath]);

  const navigate = useCallback((path: RoutePath) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectCategory = useCallback(
    (category: NewsCategory) => {
      setArchiveQuery('');
      setArchiveCategory(category);
      setArchiveKey((k) => k + 1);
      navigate('/latest-news');
    },
    [navigate]
  );

  const handleApplySearchToArchive = useCallback(
    (q: string, cat: NewsCategory | 'All') => {
      setArchiveQuery(q);
      setArchiveCategory(cat);
      setArchiveKey((k) => k + 1);
      navigate('/latest-news');
    },
    [navigate]
  );

  const handleExplainArticle = useCallback((article: Article) => {
    setExplainerArticle(article);
    setExplainerOpen(true);
  }, []);

  const handleOpenGeneralExplainer = useCallback(() => {
    setExplainerArticle(null);
    setExplainerOpen(true);
  }, []);

  const upcomingEvents = useMemo(
    () => filterCosmicEvents(VERIFIED_COSMIC_EVENTS, { onlyUpcoming: true }),
    []
  );

  const renderPage = () => {
    switch (currentPath) {
      case '/':
        return (
          <HomePage
            articles={articles}
            loadingNews={loadingNews}
            refreshingNews={refreshingNews}
            newsError={newsError}
            feedStatus={feedStatus}
            isStale={isStale}
            lastUpdated={lastUpdated}
            nextRefreshAt={nextRefreshAt}
            refreshIntervalMs={refreshIntervalMs}
            feedHealth={feedHealth}
            newArticlesBanner={newArticlesBanner}
            apod={apod}
            loadingApod={loadingApod}
            apodError={apodError}
            upcomingEvents={upcomingEvents}
            onNavigate={navigate}
            onSelectCategory={handleSelectCategory}
            onExplainArticle={handleExplainArticle}
            onOpenExplainer={handleOpenGeneralExplainer}
            onSelectApodDate={(d) => void fetchApod(d)}
            onRefreshNews={() => void fetchNews(true)}
          />
        );
      case '/latest-news':
        return (
          <LatestNewsPage
            key={archiveKey}
            articles={articles}
            publishers={publishers}
            feedStatus={feedStatus}
            isStale={isStale}
            feedHealth={feedHealth}
            lastUpdated={lastUpdated}
            nextRefreshAt={nextRefreshAt}
            refreshIntervalMs={refreshIntervalMs}
            loading={loadingNews}
            refreshing={refreshingNews}
            errorMessage={newsError}
            newArticlesBanner={newArticlesBanner}
            initialQuery={archiveQuery}
            initialCategory={archiveCategory}
            onExplainArticle={handleExplainArticle}
            onRefresh={() => void fetchNews(true)}
          />
        );
      case '/astronomy':
        return (
          <TopicSectionPage
            key="/astronomy"
            kicker="Observational Science Desk"
            title="Astronomy"
            description="Deep-sky surveys, exoplanet transmission spectroscopy, planetary studies across our Solar System, and galaxy morphology observed across the electromagnetic spectrum."
            heroImage={GENERATED_IMAGES.exoplanet}
            heroImageAlt="Temperate exoplanet atmosphere observed from orbit"
            categories={['Astronomy', 'Exoplanets', 'Solar System', 'Galaxies']}
            articles={articles}
            onExplainArticle={handleExplainArticle}
            onOpenExplainer={handleOpenGeneralExplainer}
          />
        );
      case '/astrophysics':
        return (
          <TopicSectionPage
            key="/astrophysics"
            kicker="Theoretical & High-Energy Desk"
            title="Astrophysics & Cosmology"
            description="Relativistic black holes, gravitational wave interferometry, dark matter mapping, cosmic inflation, neutron stars, and the fundamental physics governing spacetime."
            heroImage={GENERATED_IMAGES.blackhole}
            heroImageAlt="Supermassive black hole accretion disk visualization"
            categories={['Astrophysics', 'Cosmology', 'Black Holes']}
            articles={articles}
            onExplainArticle={handleExplainArticle}
            onOpenExplainer={handleOpenGeneralExplainer}
          />
        );
      case '/space-missions':
        return (
          <SpaceMissionsPage
            articles={articles}
            onExplainArticle={handleExplainArticle}
          />
        );
      case '/discoveries':
        return (
          <TopicSectionPage
            key="/discoveries"
            kicker="Peer-Reviewed Research & Breakthroughs"
            title="Scientific Discoveries"
            description="High-impact findings redefining our knowledge of early galaxy formation, compact objects, exoplanet habitability, and dark-sector cosmology."
            heroImage={GENERATED_IMAGES.galaxy}
            heroImageAlt="Grand-design spiral galaxy deep field photograph"
            categories={['Cosmology', 'Black Holes', 'Exoplanets', 'Galaxies', 'Astrophysics']}
            articles={articles}
            onExplainArticle={handleExplainArticle}
            onOpenExplainer={handleOpenGeneralExplainer}
          />
        );
      case '/cosmic-calendar':
        return <CosmicCalendarPage />;
      case '/about':
        return <AboutPage onNavigate={navigate} />;
      case '/contact':
        return <ContactPage />;
      case '/editorial-policy':
        return <EditorialPolicyPage />;
      case '/disclaimer':
        return <DisclaimerPage />;
      case '/privacy':
        return <LegalDocumentPage type="privacy" />;
      case '/terms':
        return <LegalDocumentPage type="terms" />;
      case 'not-found':
      default:
        return (
          <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-mono text-[#60A5FA] tracking-wider">Signal Lost · 404</p>
            <h1 className="mt-3 font-serif text-4xl font-medium text-[#F8FAFC]">
              Sector Not Found
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
              The {BRAND.name} page or archive link you requested does not exist. Return to the front page or browse our latest verified space dispatches.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3B82F6] transition-colors cursor-pointer"
              >
                Return to Home
              </button>
              <button
                type="button"
                onClick={() => navigate('/latest-news')}
                className="rounded-full border border-[#1E293B] bg-[#0D121E] px-5 py-2.5 text-sm font-medium text-[#E2E8F0] hover:border-[#334155] transition-colors cursor-pointer"
              >
                Browse Latest News
              </button>
            </div>
          </section>
        );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen flex flex-col bg-[#07090E] text-[#F1F5F9]">
        <MobileCosmicAtmosphere />
        <ScrollProgressBar />

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#2563EB] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>

        <Header
          currentPath={currentPath}
          onNavigate={navigate}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenExplainer={handleOpenGeneralExplainer}
        />

        <main id="main-content" className="relative z-10 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentPath}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense
                fallback={
                  <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                    <div className="h-6 w-48 cosmic-shimmer rounded-full" />
                    <div className="mt-4 h-10 w-80 max-w-full cosmic-shimmer rounded-xl" />
                  </div>
                }
              >
                {renderPage()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="relative z-10">
          <Footer onNavigate={navigate} />
        </div>

        {searchOpen && (
          <Suspense fallback={null}>
            <SearchModal
              open={searchOpen}
              articles={articles}
              onClose={() => setSearchOpen(false)}
              onExplain={handleExplainArticle}
              onApplySearchToArchive={handleApplySearchToArchive}
            />
          </Suspense>
        )}

        {explainerOpen && (
          <Suspense fallback={null}>
            <CosmicExplainerDrawer
              open={explainerOpen}
              article={explainerArticle}
              onClose={() => setExplainerOpen(false)}
              onClearArticle={() => setExplainerArticle(null)}
            />
          </Suspense>
        )}
      </div>
    </MotionConfig>
  );
}
