export const NEWS_CATEGORIES = [
  'Astronomy',
  'Astrophysics',
  'Cosmology',
  'Black Holes',
  'Exoplanets',
  'Galaxies',
  'Solar System',
  'Rocket Science',
  'Space Exploration',
  'Space Technology',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const EDITORIAL_DESKS = [
  'Astronomy',
  'Astrophysics',
  'Cosmology',
  'Space Missions',
  'NASA',
  'ISRO',
  'ESA',
  'Scientific Discoveries',
  'Black Holes',
  'Exoplanets',
] as const;

export type EditorialDesk = (typeof EDITORIAL_DESKS)[number];

export type FeedStatus = 'live' | 'partial' | 'stale-cache' | 'sample-fallback';

export type RoutePath =
  | '/'
  | '/latest-news'
  | '/astronomy'
  | '/astrophysics'
  | '/space-missions'
  | '/discoveries'
  | '/cosmic-calendar'
  | '/about'
  | '/contact'
  | '/editorial-policy'
  | '/disclaimer'
  | '/privacy'
  | '/terms';

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  publisher: string;
  publishedAt: string; // Original publisher ISO 8601 timestamp, or '' if unavailable (never fabricated)
  retrievedAt?: string; // ISO 8601 timestamp when COSMO WIRES retrieved this dispatch
  category: NewsCategory;
  desks?: EditorialDesk[];
  topics: string[];
  imageUrl?: string;
  imageAlt?: string;
  sourceFeed: string;
  isSample: boolean;
}

export interface FeedHealth {
  publisher: string;
  status: 'ok' | 'unavailable';
  count: number;
  lastChecked: string;
  sourceType?: 'rss' | 'api';
  notModified?: boolean;
  note?: string;
}

export interface NewsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface NewsApiResponse {
  articles: Article[];
  total: number;
  feedStatus: FeedStatus;
  isStale: boolean;
  lastUpdated: string;
  lastAttemptedAt: string;
  nextRefreshAt: string;
  refreshIntervalMs: number;
  lastError?: string;
  publishers: string[];
  feedHealth: FeedHealth[];
  pagination?: NewsPagination;
}

export interface ApodData {
  title: string;
  date: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  copyright?: string;
  sourceUrl: string;
  isFallback: boolean;
  fallbackNotice?: string;
}

export type CosmicEventType =
  | 'Meteor Shower'
  | 'Lunar Eclipse'
  | 'Solar Eclipse'
  | 'Planetary Conjunction'
  | 'Moon Phase'
  | 'Space Launch'
  | 'Astronomical Event';

export interface CosmicEvent {
  id: string;
  title: string;
  type: CosmicEventType;
  utcDate: string; // Verified ISO UTC timestamp
  datePrecision: 'exact-utc' | 'date-only';
  visibility: string;
  description: string;
  sourceReference: string;
  sourceUrl: string;
}

export interface SpaceMission {
  id: string;
  name: string;
  agency: string;
  status: 'Active Operations' | 'In Transit' | 'Upcoming Launch';
  launchDate: string;
  destination: string;
  instrumentHighlight: string;
  summary: string;
  officialUrl: string;
  imageCategory: 'observatory' | 'exoplanet' | 'galaxy' | 'blackhole';
}

export type ExplainerMode =
  | 'explain-simple'
  | 'summarize'
  | 'significance'
  | 'glossary'
  | 'qa';

export interface ExplainerRequest {
  mode: ExplainerMode;
  question?: string;
  article?: {
    title: string;
    excerpt: string;
    publisher: string;
    category: string;
    publishedAt: string;
  };
}

export interface ExplainerResponse {
  answer: string;
  mode: ExplainerMode;
  model: string;
  generatedAt: string;
  disclaimer: string;
}
