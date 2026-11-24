import { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ACTIVE_SPACE_MISSIONS } from '../data/editorialData';
import { Article, SpaceMission } from '../types';
import { GENERATED_IMAGES } from '../utils/mediaAssets';
import { filterAndSearchArticles } from '../utils/newsLogic';
import { ArticleCard } from '../components/ArticleCard';

interface SpaceMissionsPageProps {
  articles: Article[];
}

const STATUS_FILTERS: Array<'All' | SpaceMission['status']> = [
  'All',
  'Active Operations',
  'In Transit',
  'Upcoming Launch',
];

export function SpaceMissionsPage({ articles }: SpaceMissionsPageProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | SpaceMission['status']>('All');

  const missions = useMemo(
    () =>
      statusFilter === 'All'
        ? ACTIVE_SPACE_MISSIONS
        : ACTIVE_SPACE_MISSIONS.filter((m) => m.status === statusFilter),
    [statusFilter]
  );

  const missionArticles = useMemo(
    () =>
      filterAndSearchArticles(articles, {
        categories: ['Space Exploration', 'Rocket Science', 'Space Technology'],
        sort: 'newest',
      }).slice(0, 6),
    [articles]
  );

  return (
    <div>
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-[#1E293B]">
        <div className="absolute inset-0">
          <img
            src={GENERATED_IMAGES.observatory}
            alt="Deep space infrared observatory deployed in orbit"
            className="h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/92 to-[#07090E]/60" />
        </div>

        <div className="relative mx-auto max-w-[1360px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-mono text-[#60A5FA] tracking-wider">
            Robotic &amp; Crewed Exploration Desk
          </p>
          <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC] max-w-3xl">
            Space Missions &amp; Deep-Space Fleet
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#CBD5E1]">
            Verified mission profiles for active observatories, interplanetary probes, and flagship launches alongside real-time spaceflight news from NASA, ESA, and ISRO.
          </p>
        </div>
      </section>

      {/* Active Missions Registry */}
      <section className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#1E293B] pb-5">
          <div>
            <p className="text-xs font-mono text-[#94A3B8]">Verified Agency Registry</p>
            <h2 className="mt-1 font-serif text-2xl lg:text-3xl font-medium text-[#F1F5F9]">
              Flagship Missions
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter missions by status">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === status
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'border border-[#1E293B] bg-[#0D121E] text-[#94A3B8] hover:border-[#334155] hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {missions.map((mission) => (
            <article
              key={mission.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-2.5 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#3B82F6]/45 hover:shadow-[0_16px_38px_rgba(3,7,18,0.55)]"
            >
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-[#090D16]">
                <img
                  src={GENERATED_IMAGES[mission.imageCategory]}
                  alt={`${mission.name} visual reference`}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-3.5 pt-4">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#94A3B8]">
                    <span className="font-medium text-[#60A5FA]">{mission.agency}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[#CBD5E1]">{mission.status}</span>
                  </div>

                  <h3 className="mt-2 font-serif text-xl font-medium text-[#F1F5F9]">
                    {mission.name}
                  </h3>

                  <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
                    {mission.summary}
                  </p>

                  <dl className="mt-4 space-y-2 border-t border-[#1E293B] pt-4 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B]">Launch</dt>
                      <dd className="font-mono text-[#CBD5E1] text-right">{mission.launchDate}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B]">Orbit / Target</dt>
                      <dd className="text-[#CBD5E1] text-right">{mission.destination}</dd>
                    </div>
                    <div>
                      <dt className="text-[#64748B]">Primary Payload</dt>
                      <dd className="mt-0.5 text-[#94A3B8]">{mission.instrumentHighlight}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 border-t border-[#1E293B]/80 pt-4">
                  <a
                    href={mission.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#0A0F1A] px-3.5 py-1.5 text-xs font-medium text-[#60A5FA] hover:border-[#3B82F6]/45 hover:text-[#93C5FD] transition-colors"
                  >
                    <span>Official Mission Portal</span>
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Related Live Mission News */}
        {missionArticles.length > 0 && (
          <div className="mt-16 border-t border-[#1E293B] pt-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-medium text-[#F1F5F9]">
              Latest Mission &amp; Propulsion Dispatches
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {missionArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
