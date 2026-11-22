import { BRAND } from '../src/config/brand.js';
import { sanitizeEmbedUrl, sanitizeUrl } from '../src/utils/newsLogic.js';
const APOD_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const APOD_TIMEOUT_MS = 7000;
const apodCache = new Map();
function buildApodSourceUrl(dateStr) {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return 'https://apod.nasa.gov/apod/astropix.html';
    const yy = match[1].slice(2);
    return `https://apod.nasa.gov/apod/ap${yy}${match[2]}${match[3]}.html`;
}
function cleanApodExplanation(text) {
    return text.replace(/\s*Tomorrow's picture:[\s\S]*$/i, '').trim();
}
function isBrokenNasaLogoPayload(title, url) {
    return (/^nasa science$/i.test(title.trim()) ||
        /nasa-logo/i.test(url) ||
        /\/themes\/nasa/i.test(url));
}
function getFallbackApod() {
    return {
        title: 'Carina-Class Interstellar Dust Pillars & Star-Forming Filaments (Archive Feature)',
        date: new Date().toISOString().slice(0, 10),
        explanation: 'Live NASA APOD retrieval is temporarily unavailable or rate-limited. While live service restores, this archival deep-space feature illustrates how ultraviolet radiation from young massive stars sculpts dense molecular hydrogen clouds into towering cosmic pillars where new solar systems condense.',
        url: '/src/assets/images/cosmic_hero_nebula_1795288668241.jpg',
        media_type: 'image',
        copyright: `${BRAND.name} Observatory Archive (NASA APOD Fallback)`,
        sourceUrl: 'https://apod.nasa.gov/apod/astropix.html',
        isFallback: true,
        fallbackNotice: 'Showing archival fallback because the NASA APOD service is currently unreachable.',
    };
}
async function fetchApodForDate(dateParam) {
    const apiKey = (process.env.NASA_API_KEY || 'DEMO_KEY').trim();
    const endpoint = new URL('https://api.nasa.gov/planetary/apod');
    endpoint.searchParams.set('api_key', apiKey);
    endpoint.searchParams.set('thumbs', 'true');
    if (dateParam) {
        endpoint.searchParams.set('date', dateParam);
    }
    try {
        const response = await fetch(endpoint.toString(), {
            headers: {
                'User-Agent': `${BRAND.botName}/1.0 (+${BRAND.siteUrl})`,
                Accept: 'application/json',
            },
            signal: AbortSignal.timeout(APOD_TIMEOUT_MS),
        });
        if (!response.ok)
            return null;
        const raw = (await response.json());
        const mediaType = raw.media_type === 'video' ? 'video' : 'image';
        const rawUrl = typeof raw.url === 'string' ? raw.url : '';
        const safeMediaUrl = mediaType === 'video'
            ? sanitizeEmbedUrl(rawUrl) ?? sanitizeUrl(rawUrl)
            : sanitizeUrl(rawUrl);
        if (!safeMediaUrl || typeof raw.title !== 'string' || typeof raw.explanation !== 'string') {
            return null;
        }
        const title = raw.title.trim();
        const explanation = cleanApodExplanation(raw.explanation);
        const dateStr = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
            ? raw.date
            : dateParam || new Date().toISOString().slice(0, 10);
        // Guard against upstream NASA APOD scraper glitches that return the NASA site logo
        if (isBrokenNasaLogoPayload(title, safeMediaUrl)) {
            return null;
        }
        return {
            title,
            date: dateStr,
            explanation,
            url: safeMediaUrl,
            hdurl: sanitizeUrl(raw.hdurl),
            media_type: mediaType,
            copyright: typeof raw.copyright === 'string' && raw.copyright.trim()
                ? raw.copyright.trim().replace(/\n/g, ' ')
                : 'NASA / Public Domain',
            sourceUrl: buildApodSourceUrl(dateStr),
            isFallback: false,
        };
    }
    catch {
        return null;
    }
}
export async function getNasaApod(requestedDate) {
    const dateParam = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : undefined;
    const cacheKey = dateParam ?? 'today';
    const cached = apodCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < APOD_CACHE_TTL_MS) {
        return cached.data;
    }
    // Primary request for requested date or today
    const primary = await fetchApodForDate(dateParam);
    if (primary) {
        apodCache.set(cacheKey, { data: primary, cachedAt: Date.now() });
        return primary;
    }
    // If no explicit date was requested and today's APOD had a NASA upstream logo glitch,
    // check the most recent 2 days for a verified NASA APOD photograph.
    if (!dateParam) {
        for (let daysAgo = 1; daysAgo <= 2; daysAgo++) {
            const priorDate = new Date(Date.now() - daysAgo * 86_400_000)
                .toISOString()
                .slice(0, 10);
            const prior = await fetchApodForDate(priorDate);
            if (prior) {
                apodCache.set(cacheKey, { data: prior, cachedAt: Date.now() });
                return prior;
            }
        }
    }
    return cached?.data ?? getFallbackApod();
}
