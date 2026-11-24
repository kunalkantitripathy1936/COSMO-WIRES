import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { BRAND } from '../config/brand';
import { Article, NEWS_CATEGORIES, NewsCategory } from '../types';
import { filterAndSearchArticles, formatDateTimeLocal } from '../utils/newsLogic';

interface SearchModalProps {
  open: boolean;
  articles: Article[];
  onClose: () => void;
  onApplySearchToArchive: (query: string, category: NewsCategory | 'All') => void;
}

export function SearchModal({
  open,
  articles,
  onClose,
  onApplySearchToArchive,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<NewsCategory | 'All'>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const results = useMemo(
    () =>
      filterAndSearchArticles(articles, {
        query,
        category,
        sort: 'newest',
      }).slice(0, 10),
    [articles, query, category]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 pt-16 sm:pt-24 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-heading"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#090D16]/95 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.75)]">
        <div className="flex items-center gap-3 border-b border-[#1E293B] px-4 py-3.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#121A2B] border border-[#1E293B] text-[#60A5FA]">
            <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <label htmlFor="global-search-input" id="global-search-heading" className="sr-only">
            Search {BRAND.name} by headline, keyword, category, or publisher
          </label>
          <input
            ref={inputRef}
            id="global-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search headlines, publishers (NASA, ESA, Space.com), or topics…"
            className="w-full bg-transparent text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close global search"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1E293B] bg-[#0D121E] text-[#94A3B8] hover:border-[#334155] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Category quick filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#1E293B] px-4 py-2.5">
          <button
            type="button"
            onClick={() => setCategory('All')}
            className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              category === 'All'
                ? 'bg-[#2563EB] text-white'
                : 'border border-transparent text-[#94A3B8] hover:bg-[#121A2B] hover:text-white'
            }`}
          >
            All Topics
          </button>
          {NEWS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                category === cat
                  ? 'bg-[#2563EB] text-white'
                  : 'border border-transparent text-[#94A3B8] hover:bg-[#121A2B] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-[#1E293B]">
          {results.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#94A3B8]">
              No matching articles found for “{query}”. Try a broader scientific term or switch categories.
            </div>
          ) : (
            results.map((article) => (
              <div
                key={article.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#0D121E] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#94A3B8]">
                    <span className="text-[#60A5FA]">{article.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{article.publisher}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={article.publishedAt} className="font-mono tabular-nums">
                      {formatDateTimeLocal(article.publishedAt)}
                    </time>
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-serif text-sm font-medium text-[#F1F5F9] hover:text-[#93C5FD] truncate"
                  >
                    {article.title}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-[#1E293B] bg-[#0D121E] px-2.5 py-1 text-[#CBD5E1] hover:border-[#334155] hover:text-white transition-colors"
                  >
                    <span>Open</span>
                    <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#1E293B] bg-[#07090E] px-4 py-3 text-xs text-[#94A3B8]">
          <span>Showing up to 10 matches</span>
          <button
            type="button"
            onClick={() => {
              onApplySearchToArchive(query, category);
              onClose();
            }}
            className="font-medium text-[#60A5FA] hover:text-[#93C5FD] cursor-pointer"
          >
            View all results in Latest News →
          </button>
        </div>
      </div>
    </div>
  );
}
