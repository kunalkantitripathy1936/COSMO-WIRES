import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import {
  Article,
  EDITORIAL_DESKS,
  EditorialDesk,
  FeedHealth,
  FeedStatus,
  NEWS_CATEGORIES,
  NewsCategory,
} from '../types';
import {
  classifyEditorialDesks,
  filterAndSearchArticles,
  paginateArticles,
} from '../utils/newsLogic';
import { ArticleCard, ArticleCardSkeleton } from '../components/ArticleCard';
import { LiveFeedStatusBar } from '../components/LiveFeedStatusBar';
import { Reveal, StaggerGrid, StaggerItem } from '../components/motion/CosmicPrimitives';

interface LatestNewsPageProps {
  articles: Article[];
  publishers: string[];
  feedStatus: FeedStatus;
  isStale: boolean;
  feedHealth: FeedHealth[];
  lastUpdated: string;
  nextRefreshAt?: string;
  refreshIntervalMs: number;
  loading: boolean;
  refreshing: boolean;
  errorMessage?: string | null;
  newArticlesBanner?: string | null;
  initialQuery: string;
  initialCategory: NewsCategory | 'All';
  onRefresh: () => void;
}

const PAGE_SIZE = 18;

export function LatestNewsPage({
  articles,
  publishers,
  feedStatus,
  isStale,
  feedHealth,
  lastUpdated,
  nextRefreshAt,
  refreshIntervalMs,
  loading,
  refreshing,
  errorMessage,
  newArticlesBanner,
  initialQuery,
  initialCategory,
  onRefresh,
}: LatestNewsPageProps) {
  const prefersReduced = useReducedMotion();
  const [query, setQuery] = useState(initialQuery);
  const [desk, setDesk] = useState<EditorialDesk | 'All'>('All');
  const [category, setCategory] = useState<NewsCategory | 'All'>(initialCategory);
  const [publisher, setPublisher] = useState<string>('All');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  const deskCounts = useMemo(() => {
    const counts = new Map<EditorialDesk, number>();
    for (const d of EDITORIAL_DESKS) counts.set(d, 0);
    for (const article of articles) {
      const articleDesks =
        article.desks && article.desks.length > 0
          ? article.desks
          : classifyEditorialDesks(
              article.title,
              article.excerpt,
              article.publisher,
              article.category
            );
      for (const d of articleDesks) {
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
    }
    return counts;
  }, [articles]);

  const filtered = useMemo(
    () =>
      filterAndSearchArticles(articles, {
        query,
        desk,
        category,
        publisher,
        sort,
      }),
    [articles, query, desk, category, publisher, sort]
  );

  const { items: pageArticles, pagination } = useMemo(
    () => paginateArticles(filtered, page, PAGE_SIZE),
    [filtered, page]
  );

  const resetToFirstPage = () => setPage(1);

  const handleResetFilters = () => {
    setQuery('');
    setDesk('All');
    setCategory('All');
    setPublisher('All');
    resetToFirstPage();
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Page Header */}
      <Reveal>
        <div className="border-b border-[#1E293B] pb-8">
          <p className="text-xs font-mono text-[#60A5FA] tracking-wider">
            Automatic Space &amp; Science News Wire
          </p>
          <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC]">
            Latest Space &amp; Astronomy News
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#94A3B8]">
            Periodically retrieved and deduplicated dispatches from NASA, ESA, ISRO coverage, Space.com, Universe Today, Phys.org, and ScienceDaily — preserving original publication timestamps, retrieval times, source attribution, and direct publisher links.
          </p>
        </div>
      </Reveal>

      {/* Transparent Periodic Sync Bar, Last Updated Timestamp, Connected Sources & Refresh News */}
      <Reveal delay={0.04} className="mt-6">
        <LiveFeedStatusBar
          feedStatus={feedStatus}
          isStale={isStale}
          lastUpdated={lastUpdated}
          nextRefreshAt={nextRefreshAt}
          refreshIntervalMs={refreshIntervalMs}
          feedHealth={feedHealth}
          initialLoading={loading && articles.length === 0}
          refreshing={refreshing}
          errorMessage={errorMessage}
          newArticlesBanner={newArticlesBanner}
          onRefresh={onRefresh}
        />
      </Reveal>

      {/* Rounded 10-Category Filter Bar + Rounded Search & Controls */}
      <Reveal delay={0.06} className="mt-6">
        <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/85 backdrop-blur-md p-5 sm:p-6 space-y-5 shadow-[0_12px_36px_rgba(3,7,18,0.35)]">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#94A3B8]">
              News Categories &amp; Agency Desks
            </p>
            <div
              className="mt-3 flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Filter dispatches by category or space agency"
            >
              <button
                type="button"
                aria-pressed={desk === 'All'}
                onClick={() => {
                  setDesk('All');
                  resetToFirstPage();
                }}
                className={`relative rounded-full px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                  desk === 'All'
                    ? 'text-white'
                    : 'bg-[#07090E]/90 text-[#94A3B8] hover:text-white border border-[#1E293B] hover:border-[#3B82F6]/45'
                }`}
              >
                {desk === 'All' && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'archive-desk-active'}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] shadow-[0_4px_16px_rgba(37,99,235,0.32)]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">All ({articles.length})</span>
              </button>

              {EDITORIAL_DESKS.map((itemDesk) => {
                const count = deskCounts.get(itemDesk) ?? 0;
                const active = desk === itemDesk;
                return (
                  <button
                    key={itemDesk}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setDesk(itemDesk);
                      setCategory('All');
                      resetToFirstPage();
                    }}
                    className={`relative rounded-full px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                      active
                        ? 'text-white'
                        : 'bg-[#07090E]/90 text-[#94A3B8] hover:text-white border border-[#1E293B] hover:border-[#3B82F6]/45'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={prefersReduced ? undefined : 'archive-desk-active'}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] shadow-[0_4px_16px_rgba(37,99,235,0.32)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">
                      {itemDesk} <span className="opacity-75">({count})</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rounded Search Field, Subject Filter, Publisher & Chronological Sort */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border-t border-[#1E293B]/80 pt-4">
            <div className="md:col-span-5 relative">
              <label htmlFor="archive-search-input" className="sr-only">
                Search news archive
              </label>
              <span className="pointer-events-none absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#121A2B] text-[#60A5FA]">
                <Search className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <input
                id="archive-search-input"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetToFirstPage();
                }}
                placeholder="Search headline, mission, agency, or topic…"
                className="h-11 w-full rounded-full border border-[#1E293B] bg-[#07090E] pl-11 pr-4 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:border-[#3B82F6] focus:outline-none transition-colors"
              />
            </div>

            <div className="md:col-span-3">
              <label htmlFor="subject-category-filter" className="sr-only">
                Filter by subject taxonomy
              </label>
              <select
                id="subject-category-filter"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as NewsCategory | 'All');
                  resetToFirstPage();
                }}
                className="h-11 w-full rounded-full border border-[#1E293B] bg-[#07090E] px-4 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none transition-colors"
              >
                <option value="All">All Subject Topics</option>
                {NEWS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="publisher-filter" className="sr-only">
                Filter by publisher
              </label>
              <select
                id="publisher-filter"
                value={publisher}
                onChange={(e) => {
                  setPublisher(e.target.value);
                  resetToFirstPage();
                }}
                className="h-11 w-full rounded-full border border-[#1E293B] bg-[#07090E] px-4 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none transition-colors"
              >
                <option value="All">All Sources</option>
                {publishers.map((pub) => (
                  <option key={pub} value={pub}>
                    {pub}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="sort-order-filter" className="sr-only">
                Sort articles chronologically
              </label>
              <select
                id="sort-order-filter"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as 'newest' | 'oldest');
                  resetToFirstPage();
                }}
                className="h-11 w-full rounded-full border border-[#1E293B] bg-[#07090E] px-4 text-sm text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Results Count & Active Filter Reset */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#94A3B8] tabular-nums">
        <span>
          Showing {pageArticles.length} of {pagination.total} dispatches · Page {pagination.page} of{' '}
          {pagination.totalPages}
        </span>
        {(query || desk !== 'All' || category !== 'All' || publisher !== 'All') && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#0D121E] px-3.5 py-1.5 font-sans text-xs font-medium text-[#60A5FA] hover:border-[#3B82F6]/50 hover:text-[#93C5FD] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      {/* Article Grid / Loading Skeletons / Empty State */}
      {loading && articles.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <ArticleCardSkeleton key={n} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#1E293B] bg-[#0D121E]/85 p-12 text-center">
          <p className="font-serif text-xl text-[#F1F5F9]">No matching dispatches found</p>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Try broadening your search terms or resetting the active category, subject, and source filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#2563EB] px-5 text-xs font-medium text-white hover:bg-[#3B82F6] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        </div>
      ) : (
        <>
          <StaggerGrid
            key={`${desk}-${category}-${publisher}-${sort}-${pagination.page}`}
            stagger={0.03}
            className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {pageArticles.map((article) => (
              <StaggerItem key={article.id} className="h-full">
                <ArticleCard
                  article={article}
                  onSelectCategory={(cat) => {
                    setCategory(cat);
                    resetToFirstPage();
                  }}
                />
              </StaggerItem>
            ))}
          </StaggerGrid>

          {/* Rounded Pagination Controls */}
          {pagination.totalPages > 1 && (
            <nav
              aria-label="News archive pagination"
              className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#1E293B] pt-6"
            >
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1E293B] bg-[#0D121E] pl-2.5 pr-4 text-xs font-medium text-[#E2E8F0] hover:border-[#3B82F6]/60 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#131D33] text-[#60A5FA]">
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>Previous Page</span>
              </button>

              <span className="text-xs font-mono text-[#94A3B8] tabular-nums">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} dispatches)
              </span>

              <button
                type="button"
                disabled={!pagination.hasMore}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1E293B] bg-[#0D121E] pl-4 pr-2.5 text-xs font-medium text-[#E2E8F0] hover:border-[#3B82F6]/60 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>Next Page</span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#131D33] text-[#60A5FA]">
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
