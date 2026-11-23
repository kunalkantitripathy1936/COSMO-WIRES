import { ArrowUpRight, Clock, Sparkles } from 'lucide-react';
import { Article, NewsCategory } from '../types';
import { formatDateTimeLocal, formatUtcTimestamp } from '../utils/newsLogic';
import { ResilientImage } from './ResilientImage';
import { TiltCard } from './motion/CosmicPrimitives';

interface ArticleCardProps {
  article: Article;
  variant?: 'lead' | 'standard' | 'compact';
  onExplain: (article: Article) => void;
  onSelectCategory?: (category: NewsCategory) => void;
}

export function ArticleCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#1E293B]/80 bg-[#0D121E]/85 p-3.5 space-y-4"
    >
      <div className="aspect-[4/3] w-full cosmic-shimmer rounded-xl" />
      <div className="space-y-3 px-1.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 cosmic-shimmer rounded-full" />
          <div className="h-3 w-24 cosmic-shimmer rounded-full" />
        </div>
        <div className="h-5 w-11/12 cosmic-shimmer rounded-lg" />
        <div className="h-5 w-3/4 cosmic-shimmer rounded-lg" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full cosmic-shimmer rounded-full" />
          <div className="h-3 w-5/6 cosmic-shimmer rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]/70">
          <div className="h-8 w-28 cosmic-shimmer rounded-full" />
          <div className="h-8 w-20 cosmic-shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ArticleCard({
  article,
  variant = 'standard',
  onExplain,
  onSelectCategory,
}: ArticleCardProps) {
  const hasPublishedDate = Boolean(article.publishedAt && Date.parse(article.publishedAt) > 0);
  const formattedPublishedAt = hasPublishedDate
    ? formatDateTimeLocal(article.publishedAt, true)
    : 'Date unavailable';
  const utcTooltip = hasPublishedDate
    ? `Original publication: ${formatUtcTimestamp(article.publishedAt, true)}`
    : 'Original publication date not provided by source';
  const retrievedLabel = article.retrievedAt
    ? formatDateTimeLocal(article.retrievedAt, true)
    : null;

  if (variant === 'compact') {
    return (
      <article className="group border-b border-[#1E293B]/80 py-5 first:pt-2 last:border-b-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A3B8]">
          {onSelectCategory ? (
            <button
              type="button"
              onClick={() => onSelectCategory(article.category)}
              className="font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors cursor-pointer"
            >
              {article.category}
            </button>
          ) : (
            <span className="font-medium text-[#60A5FA]">{article.category}</span>
          )}
          <span aria-hidden="true">·</span>
          <span className="text-[#CBD5E1]">{article.publisher}</span>
          <span aria-hidden="true">·</span>
          {hasPublishedDate ? (
            <time
              dateTime={article.publishedAt}
              title={utcTooltip}
              className="font-mono tabular-nums"
            >
              Published {formattedPublishedAt}
            </time>
          ) : (
            <span className="font-mono text-[#64748B]">Published: Date unavailable</span>
          )}
          {article.isSample && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#C4B5FD]">Archive Sample</span>
            </>
          )}
        </div>

        <h3 className="mt-2 font-serif text-lg font-medium leading-snug text-[#F1F5F9] group-hover:text-white transition-colors">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline decoration-[#3B82F6]/60 underline-offset-4"
          >
            {article.title}
          </a>
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8] line-clamp-2">
          {article.excerpt}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-medium">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[38px] sm:min-h-0 items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#07090E]/80 px-3.5 py-1.5 text-[#E2E8F0] hover:border-[#3B82F6]/50 hover:text-white active:scale-[0.97] active:border-[#3B82F6]/70 transition-[border-color,color,transform] duration-150"
          >
            <span>Read Article</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#60A5FA]" strokeWidth={1.75} aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => onExplain(article)}
            className="inline-flex min-h-[38px] sm:min-h-0 items-center gap-1.5 rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-3.5 py-1.5 text-[#C4B5FD] hover:bg-[#8B5CF6]/20 hover:text-white active:scale-[0.97] active:bg-[#8B5CF6]/25 transition-[background-color,color,transform] duration-150 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span>Explain Science</span>
          </button>
        </div>
      </article>
    );
  }

  if (variant === 'lead') {
    return (
      <TiltCard maxTiltDeg={2.4}>
        <article className="group grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 backdrop-blur-md p-3 sm:p-4 gap-4 lg:gap-6 transition-[border-color,box-shadow] duration-300 hover:border-[#3B82F6]/50 hover:shadow-[0_22px_48px_rgba(3,7,18,0.65)]">
          <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto lg:min-h-[340px] overflow-hidden rounded-xl bg-[#090D16]">
            <ResilientImage
              src={article.imageUrl}
              alt={article.imageAlt || article.title}
              category={article.category}
              loading="eager"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07090E]/55 via-transparent to-transparent" />
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between p-2 sm:p-3 lg:py-4 lg:pr-4">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A3B8]">
                {onSelectCategory ? (
                  <button
                    type="button"
                    onClick={() => onSelectCategory(article.category)}
                    className="font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors cursor-pointer"
                  >
                    {article.category}
                  </button>
                ) : (
                  <span className="font-medium text-[#60A5FA]">{article.category}</span>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#CBD5E1]">{article.publisher}</span>
                {article.isSample && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#C4B5FD]">Archive Sample</span>
                  </>
                )}
              </div>

              <h3 className="mt-3 font-serif text-2xl lg:text-[1.75rem] font-medium leading-[1.2] text-[#F8FAFC]">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#93C5FD] transition-colors"
                >
                  {article.title}
                </a>
              </h3>

              <p className="mt-3.5 text-[15px] leading-relaxed text-[#94A3B8]">
                {article.excerpt}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#94A3B8] tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-[#64748B]" strokeWidth={1.75} aria-hidden="true" />
                  {hasPublishedDate ? (
                    <time dateTime={article.publishedAt} title={utcTooltip}>
                      Published: {formattedPublishedAt}
                    </time>
                  ) : (
                    <span>Published: Date unavailable</span>
                  )}
                </span>
                {retrievedLabel && (
                  <>
                    <span aria-hidden="true" className="text-[#334155]">·</span>
                    <span className="text-[#64748B]">Retrieved: {retrievedLabel}</span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#1E293B]/80 pt-4">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[42px] sm:min-h-0 items-center gap-2 rounded-full bg-[#2563EB] pl-4 pr-3 py-2 text-xs font-medium text-white hover:bg-[#3B82F6] active:scale-[0.97] active:bg-[#3B82F6] transition-[background-color,transform] duration-150 whitespace-nowrap"
              >
                <span>Read Article</span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </a>
              <button
                type="button"
                onClick={() => onExplain(article)}
                aria-label={`Explain "${article.title}" with Cosmic Explainer`}
                className="inline-flex min-h-[42px] sm:min-h-0 items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3.5 py-2 text-xs font-medium text-[#C4B5FD] hover:bg-[#8B5CF6]/20 hover:text-white active:scale-[0.97] active:bg-[#8B5CF6]/25 transition-[background-color,color,transform] duration-150 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Cosmic Explainer</span>
              </button>
            </div>
          </div>
        </article>
      </TiltCard>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 backdrop-blur-sm p-3 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[#3B82F6]/50 hover:shadow-[0_18px_38px_rgba(3,7,18,0.58)] active:border-[#3B82F6]/60">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#090D16]">
        <ResilientImage
          src={article.imageUrl}
          alt={article.imageAlt || article.title}
          category={article.category}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07090E]/50 via-transparent to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-60" />
      </div>

      <div className="flex flex-1 flex-col justify-between px-2 pb-2 pt-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A3B8]">
            {onSelectCategory ? (
              <button
                type="button"
                onClick={() => onSelectCategory(article.category)}
                className="font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors cursor-pointer"
              >
                {article.category}
              </button>
            ) : (
              <span className="font-medium text-[#60A5FA]">{article.category}</span>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-medium text-[#CBD5E1]">{article.publisher}</span>
            {article.isSample && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#C4B5FD]">Archive Sample</span>
              </>
            )}
          </div>

          <h3 className="mt-2.5 font-serif text-lg font-medium leading-snug text-[#F8FAFC]">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#93C5FD] transition-colors"
            >
              {article.title}
            </a>
          </h3>

          <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8] line-clamp-3">
            {article.excerpt}
          </p>

          <div className="mt-3.5 space-y-0.5 text-[11px] font-mono text-[#94A3B8] tabular-nums">
            <p className="truncate">
              {hasPublishedDate ? (
                <time dateTime={article.publishedAt} title={utcTooltip}>
                  Published: {formattedPublishedAt}
                </time>
              ) : (
                <span className="text-[#64748B]">Published: Date unavailable</span>
              )}
            </p>
            {retrievedLabel && (
              <p className="truncate text-[#64748B]">Retrieved: {retrievedLabel}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2.5 border-t border-[#1E293B]/80 pt-3.5 text-xs font-medium">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] sm:min-h-0 items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#07090E]/85 pl-3.5 pr-2 py-1.5 text-[#F1F5F9] hover:border-[#3B82F6]/60 hover:text-white active:scale-[0.97] active:border-[#3B82F6]/70 transition-[border-color,color,transform] duration-150 whitespace-nowrap"
          >
            <span>Read Article</span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#131D33] text-[#60A5FA]">
              <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </a>

          <button
            type="button"
            onClick={() => onExplain(article)}
            aria-label={`Explain "${article.title}" with Cosmic Explainer`}
            className="inline-flex min-h-[40px] sm:min-h-0 items-center gap-1.5 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-3.5 py-1.5 text-[#C4B5FD] hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/20 hover:text-white active:scale-[0.97] active:bg-[#8B5CF6]/25 transition-[border-color,background-color,color,transform] duration-150 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span>Explain</span>
          </button>
        </div>
      </div>
    </article>
  );
}
