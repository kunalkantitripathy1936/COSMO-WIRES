import { useMemo, useState } from 'react';
import { ArrowUpRight, Calendar, Globe } from 'lucide-react';
import { VERIFIED_COSMIC_EVENTS } from '../data/cosmicCalendar';
import { CosmicEventType } from '../types';
import {
  filterCosmicEvents,
  formatDateTimeLocal,
  formatUtcTimestamp,
} from '../utils/newsLogic';
import { Reveal } from '../components/motion/CosmicPrimitives';
import { SolarSystemOrrery } from '../components/three/SolarSystemOrrery';

const EVENT_TYPES: Array<'All' | CosmicEventType> = [
  'All',
  'Solar Eclipse',
  'Lunar Eclipse',
  'Meteor Shower',
  'Planetary Conjunction',
  'Moon Phase',
  'Space Launch',
  'Astronomical Event',
];

export function CosmicCalendarPage() {
  const [selectedType, setSelectedType] = useState<'All' | CosmicEventType>('All');
  const [onlyUpcoming, setOnlyUpcoming] = useState(true);

  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    } catch {
      return 'Local Time';
    }
  }, []);

  const events = useMemo(
    () =>
      filterCosmicEvents(VERIFIED_COSMIC_EVENTS, {
        type: selectedType,
        onlyUpcoming,
      }),
    [selectedType, onlyUpcoming]
  );

  const getCountdownLabel = (utcDate: string): string => {
    const diffMs = new Date(utcDate).getTime() - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays > 0) return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-8">
        <p className="text-xs font-mono text-[#60A5FA] tracking-wider">
          Astronomical Ephemeris · Verified 2026–2027 Schedule
        </p>
        <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC]">
          Cosmic Calendar
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#94A3B8]">
          Verified eclipses, meteor shower peaks, planetary oppositions, lunar phases, and flagship spaceflight windows sourced from NASA Goddard, the U.S. Naval Observatory, and the International Meteor Organization.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-mono text-[#CBD5E1]">
          <span className="inline-flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-[#60A5FA]" aria-hidden="true" />
            <span>Displaying times in your local timezone: {userTimezone}</span>
          </span>
          <span aria-hidden="true" className="text-[#475569]">|</span>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUpcoming}
              onChange={(e) => setOnlyUpcoming(e.target.checked)}
              className="h-4 w-4 rounded border-[#334155] bg-[#0D121E] accent-[#2563EB]"
            />
            <span>Show upcoming events only</span>
          </label>
        </div>
      </div>

      {/* Interactive 3D Orbital Atlas */}
      <Reveal delay={0.04} className="mt-8">
        <SolarSystemOrrery />
      </Reveal>

      {/* Type Filters */}
      <div
        className="mt-6 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter astronomical events by category"
      >
        {EVENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedType === type
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'border border-[#1E293B] bg-[#0D121E] text-[#94A3B8] hover:border-[#334155] hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Calendar Ledger */}
      <div className="mt-8 space-y-4">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-10 text-center text-sm text-[#94A3B8]">
            No events match this filter. Toggle “Show upcoming events only” or pick “All”.
          </div>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-6 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#3B82F6]/45 hover:shadow-[0_14px_34px_rgba(3,7,18,0.45)]"
            >
              {/* Date Column */}
              <div className="lg:col-span-3 flex flex-col justify-between border-b border-[#1E293B] pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#60A5FA]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#121A2B] border border-[#1E293B]">
                      <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span>{event.type}</span>
                  </div>
                  <p className="mt-2.5 font-mono text-base font-medium text-[#F8FAFC] tabular-nums">
                    {formatDateTimeLocal(event.utcDate, event.datePrecision === 'exact-utc')}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#64748B] tabular-nums">
                    {formatUtcTimestamp(event.utcDate, event.datePrecision === 'exact-utc')}
                  </p>
                </div>
                <p className="mt-3 font-mono text-xs text-[#A78BFA] tabular-nums">
                  {getCountdownLabel(event.utcDate)}
                </p>
              </div>

              {/* Event Narrative */}
              <div className="lg:col-span-6 space-y-2.5">
                <h2 className="font-serif text-xl sm:text-2xl font-medium text-[#F8FAFC]">
                  {event.title}
                </h2>
                <p className="text-sm leading-relaxed text-[#CBD5E1]">{event.description}</p>
                <p className="text-xs leading-relaxed text-[#94A3B8]">
                  <span className="font-medium text-[#CBD5E1]">Visibility &amp; Notes:</span>{' '}
                  {event.visibility}
                </p>
              </div>

              {/* Verification Source */}
              <div className="lg:col-span-3 flex flex-col justify-between lg:items-end lg:text-right">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#64748B]">
                    Ephemeris Source
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#CBD5E1]">
                    {event.sourceReference}
                  </p>
                </div>

                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#0A0F1A] px-3.5 py-1.5 text-xs font-medium text-[#60A5FA] hover:border-[#3B82F6]/45 hover:text-[#93C5FD] transition-colors self-start lg:self-end"
                >
                  <span>Verify Ephemeris</span>
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
