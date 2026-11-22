import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BRAND } from '../src/config/brand.js';
import {
  classifyEditorialDesks,
  deduplicateAndSortArticles,
  parseRssOrAtomXml,
  parseSpaceflightNewsApiResponse,
} from '../src/utils/newsLogic.js';
import { EDITORIAL_ARCHIVE_SAMPLES } from '../src/data/editorialData.js';
import type { Article, FeedHealth, FeedStatus, NewsApiResponse } from '../src/types.js';

interface FeedSource {
  id: string;
  publisher: string;
  url: string;
  sourceType: 'rss' | 'api';
  maxItems: number;
  note?: string;
}

/**
 * Strictly allowlisted official RSS/Atom feeds and documented public APIs.
 * Zero website scraping; every item preserves original publisher attribution & canonical URL.
 */
const VERIFIED_FEEDS: FeedSource[] = [
  {
    id: 'nasa-breaking',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    sourceType: 'rss',
    maxItems: 22,
  },
  {
    id: 'nasa-releases',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/news-release/feed/',
    sourceType: 'rss',
    maxItems: 18,
  },
  {
    id: 'esa-top',
    publisher: 'ESA',
    url: 'https://www.esa.int/rssfeed/TopNews',
    sourceType: 'rss',
    maxItems: 20,
  },
  {
    id: 'space-com',
    publisher: 'Space.com',
    url: 'https://www.space.com/feeds/all',
    sourceType: 'rss',
    maxItems: 22,
  },
  {
    id: 'universe-today',
    publisher: 'Universe Today',
    url: 'https://www.universetoday.com/feed/',
    sourceType: 'rss',
    maxItems: 20,
  },
  {
    id: 'phys-org',
    publisher: 'Phys.org',
    url: 'https://phys.org/rss-feed/space-news/',
    sourceType: 'rss',
    maxItems: 20,
  },
  {
    id: 'sciencedaily',
    publisher: 'ScienceDaily',
    url: 'https://www.sciencedaily.com/rss/space_time.xml',
    sourceType: 'rss',
    maxItems: 20,
  },
  {
    id: 'snapi-general',
    publisher: 'Spaceflight News API',
    url: 'https://api.spaceflightnewsapi.net/v4/articles/?limit=20',
    sourceType: 'api',
    maxItems: 20,
    note: 'Documented public REST API (SNAPI v4)',
  },
  {
    id: 'snapi-isro',
    publisher: 'ISRO Coverage (SNAPI)',
    url: 'https://api.spaceflightnewsapi.net/v4/articles/?title_contains=ISRO&limit=10',
    sourceType: 'api',
    maxItems: 10,
    note: 'Verified ISRO mission dispatches via Spaceflight News API v4 (ISRO direct XML feed unavailable)',
  },
];

function resolveRefreshIntervalMs(): number {
  const envMinutes = Number(process.env.NEWS_REFRESH_INTERVAL_MINUTES);
  if (Number.isFinite(envMinutes) && envMinutes >= 5 && envMinutes <= 60) {
    return Math.round(envMinutes * 60 * 1000);
  }
  return 15 * 60 * 1000; // Default: 15 minutes (configurable 5–60 min)
}

export const REFRESH_INTERVAL_MS = resolveRefreshIntervalMs();
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const FEED_TIMEOUT_MS = IS_SERVERLESS ? 6000 : 8000;
const MAX_FEED_ATTEMPTS = IS_SERVERLESS ? 2 : 2;
const RETRY_BASE_DELAY_MS = IS_SERVERLESS ? 300 : 600;
const MANUAL_REFRESH_COOLDOWN_MS = 8_000;
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'cosmo-wires-data')
  : path.resolve(process.cwd(), 'data');
const CACHE_FILE = path.join(DATA_DIR, 'news-cache.json');

interface CachedNewsState {
  articles: Article[];
  feedHealth: FeedHealth[];
  lastUpdated: string; // Last SUCCESSFUL live update timestamp
  lastAttemptedAt: string;
  feedStatus: FeedStatus;
  isStale: boolean;
  lastError?: string;
}

let memoryCache: CachedNewsState | null = null;
let lastSuccessfulFetchMs = 0;
let lastAttemptMs = 0;
let inFlightFetch: Promise<CachedNewsState> | null = null;
let schedulerStarted = false;

interface FeedConditionalEntry {
  etag?: string;
  lastModified?: string;
  articles: Article[];
}

const feedConditionalCache = new Map<string, FeedConditionalEntry>();

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSingleFeed(source: FeedSource): Promise<{
  articles: Article[];
  health: FeedHealth;
}> {
  let lastErrorMsg = '';
  const prevConditional = feedConditionalCache.get(source.id);

  for (let attempt = 1; attempt <= MAX_FEED_ATTEMPTS; attempt++) {
    const checkedAt = new Date().toISOString();
    try {
      const headers: Record<string, string> = {
        'User-Agent': `${BRAND.botName}/1.2 (+${BRAND.siteUrl}; Space News Aggregator)`,
        Accept:
          source.sourceType === 'api'
            ? 'application/json'
            : 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      };
      if (prevConditional?.etag) {
        headers['If-None-Match'] = prevConditional.etag;
      }
      if (prevConditional?.lastModified) {
        headers['If-Modified-Since'] = prevConditional.lastModified;
      }

      const response = await fetch(source.url, {
        headers,
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      });

      // Respect HTTP 304 Not Modified to avoid redundant re-parsing of unchanged feeds
      if (response.status === 304 && prevConditional && prevConditional.articles.length > 0) {
        return {
          articles: prevConditional.articles,
          health: {
            publisher: source.publisher,
            status: 'ok',
            count: prevConditional.articles.length,
            lastChecked: checkedAt,
            sourceType: source.sourceType,
            notModified: true,
            note: source.note ? `${source.note} (unchanged since last check)` : 'Unchanged since last check (HTTP 304)',
          },
        };
      }

      if (!response.ok) {
        lastErrorMsg = `HTTP ${response.status}`;
        // Retry only on transient server/rate-limit errors
        if (attempt < MAX_FEED_ATTEMPTS && (response.status >= 500 || response.status === 429)) {
          await waitMs(RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        return {
          articles: [],
          health: {
            publisher: source.publisher,
            status: 'unavailable',
            count: 0,
            lastChecked: checkedAt,
            sourceType: source.sourceType,
            note: lastErrorMsg,
          },
        };
      }

      let parsed: Article[] = [];
      if (source.sourceType === 'api') {
        const json = (await response.json()) as unknown;
        parsed = parseSpaceflightNewsApiResponse(json, source.url, checkedAt).slice(
          0,
          source.maxItems
        );
      } else {
        const xmlText = await response.text();
        parsed = parseRssOrAtomXml(xmlText, source.publisher, source.url, checkedAt).slice(
          0,
          source.maxItems
        );
      }

      if (parsed.length > 0) {
        const etag = response.headers.get('etag') || undefined;
        const lastModified = response.headers.get('last-modified') || undefined;
        feedConditionalCache.set(source.id, {
          etag,
          lastModified,
          articles: parsed,
        });
      }

      return {
        articles: parsed,
        health: {
          publisher: source.publisher,
          status: parsed.length > 0 ? 'ok' : 'unavailable',
          count: parsed.length,
          lastChecked: checkedAt,
          sourceType: source.sourceType,
          notModified: false,
          note: parsed.length > 0 ? source.note : 'No valid articles returned',
        },
      };
    } catch (err) {
      lastErrorMsg = err instanceof Error ? err.message : 'Network timeout';
      if (attempt < MAX_FEED_ATTEMPTS) {
        await waitMs(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      return {
        articles: [],
        health: {
          publisher: source.publisher,
          status: 'unavailable',
          count: 0,
          lastChecked: checkedAt,
          sourceType: source.sourceType,
          note: lastErrorMsg,
        },
      };
    }
  }

  return {
    articles: [],
    health: {
      publisher: source.publisher,
      status: 'unavailable',
      count: 0,
      lastChecked: new Date().toISOString(),
      sourceType: source.sourceType,
      note: lastErrorMsg || 'Unavailable',
    },
  };
}

function hydrateArticleDesks(articles: Article[]): Article[] {
  return articles.map((article) => ({
    ...article,
    desks: classifyEditorialDesks(
      article.title,
      article.excerpt,
      article.publisher,
      article.category
    ),
  }));
}

async function loadDiskCache(): Promise<CachedNewsState | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as CachedNewsState;
    if (Array.isArray(parsed.articles) && parsed.articles.length > 0) {
      return {
        ...parsed,
        articles: hydrateArticleDesks(parsed.articles),
        lastAttemptedAt: parsed.lastAttemptedAt || parsed.lastUpdated,
        isStale: Boolean(parsed.isStale),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function saveDiskCache(state: CachedNewsState): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

function consolidateFeedHealth(entries: FeedHealth[]): FeedHealth[] {
  const byPublisher = new Map<string, FeedHealth>();
  for (const item of entries) {
    const existing = byPublisher.get(item.publisher);
    if (!existing) {
      byPublisher.set(item.publisher, { ...item });
    } else {
      existing.count += item.count;
      if (item.status === 'ok') {
        existing.status = 'ok';
        existing.note = item.note || existing.note;
      }
      existing.lastChecked = item.lastChecked;
    }
  }
  return Array.from(byPublisher.values());
}

export async function refreshNewsFeeds(): Promise<CachedNewsState> {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    const startedMs = Date.now();
    const attemptIso = new Date().toISOString();
    lastAttemptMs = startedMs;

    const results = await Promise.all(VERIFIED_FEEDS.map((feed) => fetchSingleFeed(feed)));
    const allLiveArticles = results.flatMap((r) => r.articles);
    const dedupedLive = deduplicateAndSortArticles(allLiveArticles);
    const consolidatedHealth = consolidateFeedHealth(results.map((r) => r.health));
    const okCount = consolidatedHealth.filter((h) => h.status === 'ok').length;
    const failedEntries = consolidatedHealth.filter((h) => h.status !== 'ok');
    const failedPublishers = failedEntries.map((h) => h.publisher);
    const durationMs = Date.now() - startedMs;

    if (failedEntries.length > 0) {
      console.warn(
        `[NewsAggregator] Partial feed issues (${durationMs}ms): ${failedEntries
          .map((f) => `${f.publisher}=${f.note || 'unavailable'}`)
          .join(', ')}`
      );
    }

    if (dedupedLive.length > 0) {
      const nextState: CachedNewsState = {
        articles: dedupedLive,
        feedHealth: consolidatedHealth,
        lastUpdated: attemptIso,
        lastAttemptedAt: attemptIso,
        feedStatus: okCount === consolidatedHealth.length ? 'live' : 'partial',
        isStale: false,
        lastError:
          failedPublishers.length > 0
            ? `Some feeds were temporarily unavailable (${failedPublishers.join(', ')}); displaying all active verified sources.`
            : undefined,
      };
      memoryCache = nextState;
      lastSuccessfulFetchMs = Date.now();
      await saveDiskCache(nextState);
      console.log(
        `[NewsAggregator] Refreshed ${dedupedLive.length} unique articles from ${okCount}/${consolidatedHealth.length} publishers in ${durationMs}ms`
      );
      return nextState;
    }

    console.error(
      `[NewsAggregator] All ${consolidatedHealth.length} upstream feeds returned 0 articles after ${durationMs}ms`
    );

    // All upstream feeds failed — preserve previously cached real articles honestly as STALE CACHE
    const existingCache = memoryCache ?? (await loadDiskCache());
    if (existingCache && existingCache.articles.some((a) => !a.isSample)) {
      const staleState: CachedNewsState = {
        articles: existingCache.articles,
        feedHealth: consolidatedHealth,
        lastUpdated: existingCache.lastUpdated,
        lastAttemptedAt: attemptIso,
        feedStatus: 'stale-cache',
        isStale: true,
        lastError:
          'Unable to reach upstream space news feeds right now. Showing previously cached dispatches until connectivity resumes.',
      };
      memoryCache = staleState;
      return staleState;
    }

    // Clearly labeled offline archival sample fallback (never masquerades as live news)
    const fallbackState: CachedNewsState = {
      articles: EDITORIAL_ARCHIVE_SAMPLES,
      feedHealth: consolidatedHealth,
      lastUpdated: attemptIso,
      lastAttemptedAt: attemptIso,
      feedStatus: 'sample-fallback',
      isStale: true,
      lastError:
        'Upstream RSS/API feeds could not be reached. Displaying clearly labeled archival samples.',
    };
    memoryCache = fallbackState;
    return fallbackState;
  })().finally(() => {
    inFlightFetch = null;
  });

  return inFlightFetch;
}

export async function getAggregatedNews(forceRefresh = false): Promise<NewsApiResponse> {
  if (!memoryCache) {
    const disk = await loadDiskCache();
    if (disk) {
      memoryCache = disk;
      const diskTs = Date.parse(disk.lastUpdated);
      if (!Number.isNaN(diskTs)) {
        lastSuccessfulFetchMs = diskTs;
      }
    }
  }

  const now = Date.now();
  const isCacheExpired =
    !memoryCache ||
    lastSuccessfulFetchMs === 0 ||
    now - lastSuccessfulFetchMs > REFRESH_INTERVAL_MS;

  const canForceRefresh = forceRefresh && now - lastAttemptMs >= MANUAL_REFRESH_COOLDOWN_MS;

  if (!memoryCache || isCacheExpired || canForceRefresh) {
    await refreshNewsFeeds();
  }

  const state = memoryCache ?? {
    articles: EDITORIAL_ARCHIVE_SAMPLES,
    feedHealth: [],
    lastUpdated: new Date().toISOString(),
    lastAttemptedAt: new Date().toISOString(),
    feedStatus: 'sample-fallback' as const,
    isStale: true,
  };

  const publishers = Array.from(new Set(state.articles.map((a) => a.publisher))).sort();
  const baseForNext = lastAttemptMs > 0 ? lastAttemptMs : Date.now();
  const nextRefreshAt = new Date(baseForNext + REFRESH_INTERVAL_MS).toISOString();

  return {
    articles: state.articles,
    total: state.articles.length,
    feedStatus: state.feedStatus,
    isStale: state.isStale,
    lastUpdated: state.lastUpdated,
    lastAttemptedAt: state.lastAttemptedAt,
    nextRefreshAt,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    lastError: state.lastError,
    publishers,
    feedHealth: state.feedHealth,
  };
}

export function getNewsHealthSummary() {
  const activeCount = memoryCache
    ? memoryCache.feedHealth.filter((f) => f.status === 'ok').length
    : 0;
  const totalSources = memoryCache ? memoryCache.feedHealth.length : VERIFIED_FEEDS.length;
  return {
    feedStatus: memoryCache?.feedStatus ?? 'initializing',
    isStale: memoryCache?.isStale ?? false,
    cachedArticles: memoryCache?.articles.length ?? 0,
    activeSources: activeCount,
    totalSources,
    lastUpdated: memoryCache?.lastUpdated ?? null,
    lastAttemptedAt: memoryCache?.lastAttemptedAt ?? null,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    schedulerActive: schedulerStarted,
  };
}

export function startScheduledNewsRefresh(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Warm cache asynchronously on boot without blocking Express listen
  void refreshNewsFeeds();

  const timer = setInterval(() => {
    void refreshNewsFeeds();
  }, REFRESH_INTERVAL_MS);
  timer.unref();
}
