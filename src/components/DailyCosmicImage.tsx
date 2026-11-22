import { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { ApodData, Article } from '../types';
import { sanitizeEmbedUrl } from '../utils/newsLogic';
import { GENERATED_IMAGES } from '../utils/mediaAssets';
import { ResilientImage } from './ResilientImage';
import { ParallaxFrame, Reveal } from './motion/CosmicPrimitives';

interface DailyCosmicImageProps {
  apod: ApodData | null;
  loading: boolean;
  error: string | null;
  onSelectDate: (dateStr: string) => void;
  onExplainApod: (articleLike: Article) => void;
}

export function DailyCosmicImage({
  apod,
  loading,
  error,
  onSelectDate,
  onExplainApod,
}: DailyCosmicImageProps) {
  const [dateInput, setDateInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  const todayMax = new Date().toISOString().slice(0, 10);

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateInput) {
      onSelectDate(dateInput);
    }
  };

  const handleExplain = () => {
    if (!apod) return;
    onExplainApod({
      id: `apod-${apod.date}`,
      title: `NASA APOD (${apod.date}): ${apod.title}`,
      excerpt: apod.explanation,
      url: apod.sourceUrl,
      publisher: 'NASA Astronomy Picture of the Day',
      publishedAt: `${apod.date}T00:00:00Z`,
      category: 'Astronomy',
      topics: ['NASA APOD', 'Astronomy'],
      imageUrl: apod.media_type === 'image' ? apod.url : undefined,
      sourceFeed: 'nasa-apod',
      isSample: apod.isFallback,
    });
  };

  const embedUrl = apod?.media_type === 'video' ? sanitizeEmbedUrl(apod.url) : undefined;

  return (
    <section
      aria-labelledby="daily-cosmic-image-heading"
      className="border-t border-[#1E293B] py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-mono text-[#60A5FA] tracking-wider">
              Daily Observatory Dispatch · NASA APOD
            </p>
            <h2
              id="daily-cosmic-image-heading"
              className="mt-2 font-serif text-3xl lg:text-4xl font-medium text-[#F1F5F9]"
            >
              Daily Cosmic Image
            </h2>
          </div>

          <form onSubmit={handleDateSubmit} className="flex items-center gap-2">
            <label htmlFor="apod-date-picker" className="sr-only">
              Select NASA APOD archive date
            </label>
            <input
              id="apod-date-picker"
              type="date"
              min="1995-06-16"
              max={todayMax}
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="h-10 rounded-full border border-[#1E293B] bg-[#0D121E]/90 px-4 text-xs font-mono text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!dateInput || loading}
              className="h-10 rounded-full border border-[#1E293B] bg-[#121A2B] px-4 text-xs font-medium text-[#F1F5F9] hover:border-[#3B82F6]/60 hover:bg-[#162036] disabled:opacity-45 transition-colors whitespace-nowrap cursor-pointer"
            >
              Load Date
            </button>
          </form>
        </div>
        </Reveal>

        {loading && !apod ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-5">
            <div className="lg:col-span-7 aspect-[16/10] animate-pulse rounded-xl bg-[#121A2B]" />
            <div className="lg:col-span-5 space-y-4 py-2">
              <div className="h-4 w-32 animate-pulse rounded-full bg-[#121A2B]" />
              <div className="h-8 w-3/4 animate-pulse rounded-lg bg-[#121A2B]" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-[#121A2B]" />
            </div>
          </div>
        ) : error && !apod ? (
          <div className="mt-8 rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-8 text-sm text-[#94A3B8]">
            {error}
          </div>
        ) : apod ? (
          <Reveal delay={0.06}>
          <div className="group mt-8 grid grid-cols-1 lg:grid-cols-12 items-stretch gap-2 overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-2.5 sm:p-3 transition-[border-color,box-shadow] duration-300 hover:border-[#3B82F6]/45 hover:shadow-[0_18px_42px_rgba(3,7,18,0.6)]">
            {/* Media Frame */}
            <div className="lg:col-span-7 relative overflow-hidden rounded-xl bg-[#05070B] min-h-[280px] lg:min-h-[420px]">
              {apod.media_type === 'video' ? (
                embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={apod.title}
                    className="h-full min-h-[320px] w-full border-0"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-8 text-center">
                    <p className="font-serif text-xl text-[#F1F5F9]">{apod.title}</p>
                    <p className="mt-2 text-sm text-[#94A3B8]">
                      Today’s NASA APOD feature is an external astronomical video.
                    </p>
                    <a
                      href={apod.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2563EB] pl-4 pr-3 py-2 text-sm font-medium text-white hover:bg-[#3B82F6] transition-colors"
                    >
                      <span>Watch Video at Source</span>
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  </div>
                )
              ) : (
                <ParallaxFrame offsetPx={14} className="h-full w-full min-h-[280px] lg:min-h-[420px]">
                  <ResilientImage
                    src={apod.url}
                    fallbackSrc={GENERATED_IMAGES.nebula}
                    alt={apod.title}
                    category="Astronomy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </ParallaxFrame>
              )}
            </div>

            {/* Scientific Context Panel */}
            <div className="lg:col-span-5 flex flex-col justify-between p-6 lg:p-8">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#94A3B8] tabular-nums">
                  <time dateTime={apod.date}>{apod.date}</time>
                  <span aria-hidden="true">·</span>
                  <span>{apod.media_type === 'video' ? 'Video Feature' : 'Astronomical Plate'}</span>
                  {apod.isFallback && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#C4B5FD]">Archive Fallback</span>
                    </>
                  )}
                </div>

                <h3 className="mt-3 font-serif text-2xl lg:text-[1.7rem] font-medium leading-snug text-[#F1F5F9]">
                  {apod.title}
                </h3>

                {apod.fallbackNotice && (
                  <p className="mt-3 text-xs text-[#C4B5FD] leading-relaxed">
                    {apod.fallbackNotice}
                  </p>
                )}

                <p
                  className={`mt-4 text-[15px] leading-relaxed text-[#CBD5E1] ${
                    expanded ? '' : 'line-clamp-6'
                  }`}
                >
                  {apod.explanation}
                </p>

                {apod.explanation.length > 340 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="mt-2 text-xs font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors cursor-pointer"
                  >
                    {expanded ? 'Show concise view' : 'Read full explanation'}
                  </button>
                )}
              </div>

              <div className="mt-6 space-y-4 border-t border-[#1E293B] pt-5">
                <p className="text-xs text-[#94A3B8]">
                  <span className="text-[#CBD5E1] font-medium">Image Credit &amp; Copyright:</span>{' '}
                  {apod.copyright || 'NASA / Public Domain'}
                </p>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleExplain}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] pl-2 pr-4 py-1.5 text-xs font-medium text-white hover:bg-[#3B82F6] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span>Explain This Image</span>
                  </button>

                  <a
                    href={apod.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#0A0F1A] px-3.5 py-2 text-xs font-medium text-[#CBD5E1] hover:border-[#334155] hover:text-white transition-colors whitespace-nowrap"
                  >
                    <span>NASA APOD Source</span>
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </a>

                  {apod.hdurl && apod.media_type === 'image' && (
                    <a
                      href={apod.hdurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors"
                    >
                      High-Res Plate
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
