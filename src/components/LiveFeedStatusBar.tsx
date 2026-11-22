import { AlertTriangle, Archive, CheckCircle2, Clock, Radio, RefreshCw } from 'lucide-react';
import { FeedHealth, FeedStatus } from '../types';
import { formatDateTimeLocal } from '../utils/newsLogic';

interface LiveFeedStatusBarProps {
  feedStatus: FeedStatus;
  isStale: boolean;
  lastUpdated: string;
  nextRefreshAt?: string;
  refreshIntervalMs: number;
  feedHealth: FeedHealth[];
  initialLoading?: boolean;
  refreshing: boolean;
  errorMessage?: string | null;
  newArticlesBanner?: string | null;
  compact?: boolean;
  onRefresh: () => void;
}

/**
 * Transparent periodic-sync status bar.
 * Reports exact last successful update time, periodic refresh cadence (15 min default),
 * active source count, and manual Refresh News / Retry trigger without fabricating continuous status.
 */
export function LiveFeedStatusBar({
  feedStatus,
  isStale,
  lastUpdated,
  nextRefreshAt,
  refreshIntervalMs,
  feedHealth,
  initialLoading = false,
  refreshing,
  errorMessage,
  newArticlesBanner,
  compact = false,
  onRefresh,
}: LiveFeedStatusBarProps) {
  const intervalMinutes = Math.max(1, Math.round(refreshIntervalMs / 60_000));
  const activeSources = feedHealth.filter((f) => f.status === 'ok').length;
  const totalSources = feedHealth.length;

  const isLive = !initialLoading && (feedStatus === 'live' || feedStatus === 'partial') && !isStale;
  const isSample = !initialLoading && feedStatus === 'sample-fallback';

  const statusMeta = initialLoading
    ? {
        label: 'Checking Space Feeds',
        icon: RefreshCw,
        circleClass: 'bg-[#131D33] border-[#3B82F6]/40 text-[#60A5FA]',
        labelClass: 'text-[#CBD5E1]',
        spin: true,
      }
    : isLive
      ? {
          label: feedStatus === 'partial' ? 'Partial Wire Sync' : 'Verified Feeds Connected',
          icon: Radio,
          circleClass: 'bg-[#3B82F6]/15 border-[#3B82F6]/40 text-[#60A5FA]',
          labelClass: 'text-[#93C5FD]',
          spin: false,
        }
      : isSample
        ? {
            label: 'Offline Archive Samples',
            icon: Archive,
            circleClass: 'bg-[#8B5CF6]/15 border-[#8B5CF6]/40 text-[#A78BFA]',
            labelClass: 'text-[#DDD6FE]',
            spin: false,
          }
        : {
            label: 'Cached Dispatches (Stale)',
            icon: AlertTriangle,
            circleClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
            labelClass: 'text-amber-200',
            spin: false,
          };

  const StatusIcon = statusMeta.icon;

  return (
    <div
      data-testid="live-feed-status-bar"
      data-feed-status={feedStatus}
      className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/85 backdrop-blur-md px-4 py-3.5 sm:px-5 shadow-[0_8px_28px_rgba(3,7,18,0.35)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="inline-flex items-center gap-2.5">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${statusMeta.circleClass} shrink-0`}
            >
              <StatusIcon
                className={`h-3.5 w-3.5 ${statusMeta.spin ? 'animate-spin' : ''}`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <span className={`font-medium ${statusMeta.labelClass}`}>{statusMeta.label}</span>
          </div>

          <span className="hidden sm:inline text-[#334155]" aria-hidden="true">
            ·
          </span>

          <span className="inline-flex items-center gap-1.5 font-mono text-[#CBD5E1] tabular-nums">
            <Clock className="h-3.5 w-3.5 text-[#64748B]" strokeWidth={1.75} aria-hidden="true" />
            <span>Last updated: {formatDateTimeLocal(lastUpdated, true)}</span>
          </span>

          <span className="hidden md:inline text-[#334155]" aria-hidden="true">
            ·
          </span>

          <span className="font-mono text-[#94A3B8] tabular-nums">
            Auto-refreshes every {intervalMinutes} min
            {totalSources > 0 ? ` · ${activeSources}/${totalSources} sources active` : ''}
            {!compact && nextRefreshAt ? ` · Next check: ${formatDateTimeLocal(nextRefreshAt, true)}` : ''}
          </span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh space news feeds now"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[#26344B] bg-[#07090E]/90 pl-2 pr-4 text-xs font-medium text-[#E2E8F0] hover:border-[#3B82F6]/65 hover:bg-[#111A2E] hover:text-white disabled:opacity-55 transition-all duration-200 whitespace-nowrap cursor-pointer"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#131D33] text-[#60A5FA]">
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
          <span>{refreshing ? 'Refreshing…' : 'Refresh News'}</span>
        </button>
      </div>

      {newArticlesBanner && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 border-t border-[#1E293B]/80 pt-2.5 text-xs text-[#86EFAC]"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#4ADE80]" strokeWidth={1.75} aria-hidden="true" />
          <span>{newArticlesBanner}</span>
        </div>
      )}

      {!compact && feedHealth.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#1E293B]/80 pt-3 text-[11px] font-mono text-[#94A3B8]">
          <span className="text-[#CBD5E1]">Connected Sources:</span>
          {feedHealth.map((source) => (
            <span
              key={source.publisher}
              title={source.note || undefined}
              className="tabular-nums"
            >
              {source.publisher}{' '}
              <span className={source.status === 'ok' ? 'text-[#60A5FA]' : 'text-[#F87171]'}>
                ({source.status === 'ok' ? `${source.count}` : 'unavailable'})
              </span>
            </span>
          ))}
        </div>
      )}

      {errorMessage && (
        <div
          role="status"
          className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#1E293B]/80 pt-3 text-xs text-amber-200/90"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}
    </div>
  );
}
