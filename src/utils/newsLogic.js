import { XMLParser } from 'fast-xml-parser';
import { EDITORIAL_DESKS, NEWS_CATEGORIES, } from '../types.js';
const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
    trimValues: true,
});
const ALLOWED_EMBED_HOSTS = new Set([
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
]);
export function sanitizeUrl(rawUrl) {
    if (typeof rawUrl !== 'string')
        return undefined;
    const trimmed = rawUrl.trim();
    if (!trimmed)
        return undefined;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return undefined;
        }
        return parsed.toString();
    }
    catch {
        return undefined;
    }
}
export function sanitizeEmbedUrl(rawUrl) {
    const safe = sanitizeUrl(rawUrl);
    if (!safe)
        return undefined;
    try {
        const parsed = new URL(safe);
        if (!ALLOWED_EMBED_HOSTS.has(parsed.hostname.toLowerCase())) {
            return undefined;
        }
        return parsed.toString();
    }
    catch {
        return undefined;
    }
}
export function stripHtmlToExcerpt(raw, maxLength = 240) {
    if (typeof raw !== 'string')
        return '';
    const withoutScripts = raw
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    const decoded = withoutScripts
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#(\d+);/g, (_, code) => {
        const n = Number(code);
        return Number.isFinite(n) && n >= 32 && n <= 126 ? String.fromCharCode(n) : ' ';
    })
        .replace(/\s+/g, ' ')
        .trim();
    if (decoded.length <= maxLength)
        return decoded;
    const sliced = decoded.slice(0, maxLength);
    const lastSpace = sliced.lastIndexOf(' ');
    return `${(lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}
const CATEGORY_RULES = [
    {
        category: 'Black Holes',
        keywords: /\b(black hole|event horizon|singularity|quasar|blazar|accretion disk|sagittarius a\*|hawking radiation|gravitational wave)\b/i,
    },
    {
        category: 'Exoplanets',
        keywords: /\b(exoplanet|habitable zone|super-earth|hot jupiter|trappist|biosignature|transiting planet|tess|kepler-\d+)\b/i,
    },
    {
        category: 'Cosmology',
        keywords: /\b(cosmolog[a-z]*|dark matter|dark energy|big bang|cosmic microwave|hubble tension|early universe|inflation|redshift|lambda-cdm)\b/i,
    },
    {
        category: 'Galaxies',
        keywords: /\b(galax[a-z]*|milky way|andromeda|nebula[a-z]*|globular cluster|magellanic|spiral arm[s]?|interstellar medium|starburst)\b/i,
    },
    {
        category: 'Rocket Science',
        keywords: /\b(rocket[s]?|starship|falcon 9|falcon heavy|ariane|vulcan|sls|new glenn|propulsion|booster[s]?|launch vehicle|orbital launch|pslv|gslv|lvm3)\b/i,
    },
    {
        category: 'Solar System',
        keywords: /\b(mars|jupiter|saturn|venus|mercury|uranus|neptune|pluto|europa|enceladus|titan|asteroid[s]?|comet[s]?|meteor[s]?|solar flare|sunspot[s]?|coronal mass|lunar|moon|kuiper)\b/i,
    },
    {
        category: 'Space Technology',
        keywords: /\b(telescope[s]?|jwst|james webb|hubble|euclid|spectrograph|satellite[s]?|cubesat|ion thruster|laser communication|spacesuit|rover[s]?|lander[s]?|radar|interferometer)\b/i,
    },
    {
        category: 'Space Exploration',
        keywords: /\b(astronaut[s]?|artemis|iss|space station|mission[s]?|voyager|gaganyaan|chandrayaan|aditya-l1|crew|spacewalk|orbit[a-z]*|human spaceflight|esa|nasa|isro)\b/i,
    },
    {
        category: 'Astrophysics',
        keywords: /\b(astrophys[a-z]*|neutron star[s]?|pulsar[s]?|magnetar[s]?|supernova[e]?|gamma-ray|x-ray|fusion|plasma|relativity|kilonova|neutrino[s]?|cosmic ray[s]?|white dwarf)\b/i,
    },
];
export function classifyCategory(title, excerpt, rawTags = []) {
    const combined = `${title} ${excerpt} ${rawTags.join(' ')}`;
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.test(combined)) {
            return rule.category;
        }
    }
    return 'Astronomy';
}
export function classifyEditorialDesks(title, excerpt, publisher, category, rawTags = []) {
    const combined = `${title} ${excerpt} ${rawTags.join(' ')}`;
    const pubLower = publisher.toLowerCase();
    const desks = new Set();
    if (pubLower.includes('nasa') ||
        /\b(nasa|jpl|goddard|artemis|jwst|james webb|hubble|perseverance|curiosity|voyager|europa clipper)\b/i.test(combined)) {
        desks.add('NASA');
    }
    if (pubLower === 'esa' ||
        pubLower.startsWith('esa ') ||
        /\b(esa|european space agency|euclid|ariane|exomars|gaia mission|cheops|juice spacecraft)\b/i.test(combined)) {
        desks.add('ESA');
    }
    if (pubLower.includes('isro') ||
        /\b(isro|indian space research|chandrayaan|gaganyaan|aditya-l1|pslv|gslv|lvm3|sriharikota|nisar|shukrayaan)\b/i.test(combined)) {
        desks.add('ISRO');
    }
    if (category === 'Space Exploration' ||
        category === 'Rocket Science' ||
        category === 'Space Technology' ||
        /\b(mission|launch|spacecraft|orbiter|lander|rover|astronaut|crew|space station|iss|probe|flyby|artemis|starship|falcon|rocket|booster|satellite)\b/i.test(combined)) {
        desks.add('Space Missions');
    }
    if (category === 'Black Holes' ||
        /\b(black hole|event horizon|singularity|quasar|blazar|accretion disk|sagittarius a\*|hawking radiation|gravitational wave|m87\*?)\b/i.test(combined)) {
        desks.add('Black Holes');
    }
    if (category === 'Exoplanets' ||
        /\b(exoplanet|habitable zone|super-earth|hot jupiter|trappist|biosignature|transiting planet|tess|kepler-\d+|extrasolar planet)\b/i.test(combined)) {
        desks.add('Exoplanets');
    }
    if (category === 'Astrophysics' ||
        category === 'Black Holes' ||
        /\b(astrophys|black hole|neutron star|pulsar|supernova|gamma-ray|x-ray|gravitational wave|relativity|plasma|magnetar|kilonova|fermi)\b/i.test(combined)) {
        desks.add('Astrophysics');
    }
    if (category === 'Cosmology' ||
        /\b(cosmolog|dark matter|dark energy|big bang|early universe|cosmic microwave|hubble tension|inflation|redshift|cosmic web|universe expansion)\b/i.test(combined)) {
        desks.add('Cosmology');
    }
    if (category === 'Astronomy' ||
        category === 'Exoplanets' ||
        category === 'Galaxies' ||
        category === 'Solar System' ||
        /\b(astronom|exoplanet|galax|nebula|comet|asteroid|eclipse|meteor|planet|star|observatory|sky|telescope)\b/i.test(combined)) {
        desks.add('Astronomy');
    }
    if (category === 'Black Holes' ||
        category === 'Exoplanets' ||
        category === 'Cosmology' ||
        /\b(discover|detect|reveal|confirm|breakthrough|first-ever|evidence|new study|astronomers find|scientists find|researchers|observations|measured|mystery)\b/i.test(combined)) {
        desks.add('Scientific Discoveries');
    }
    if (desks.size === 0) {
        desks.add('Astronomy');
    }
    return Array.from(desks);
}
export function isValidEditorialDesk(value) {
    return EDITORIAL_DESKS.includes(value);
}
export function extractTopics(title, excerpt, category) {
    const text = `${title} ${excerpt}`;
    const candidateTerms = [
        'JWST',
        'Hubble',
        'Mars',
        'Artemis',
        'Dark Matter',
        'Dark Energy',
        'Black Holes',
        'Exoplanets',
        'Supernova',
        'Gravitational Waves',
        'Solar Activity',
        'Lunar',
        'Europa',
        'Deep Space',
        'Cosmology',
        'Neutron Stars',
        'Galaxies',
        'Orbital Launch',
    ];
    const matched = candidateTerms.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text));
    if (!matched.includes(category)) {
        matched.unshift(category);
    }
    return matched.slice(0, 4);
}
function normalizeTextValue(node) {
    if (typeof node === 'string')
        return node;
    if (typeof node === 'number')
        return String(node);
    if (node && typeof node === 'object' && '#text' in node) {
        return String(node['#text'] ?? '');
    }
    return '';
}
function asArray(value) {
    if (value === undefined || value === null)
        return [];
    return Array.isArray(value) ? value : [value];
}
function asRecordArray(value) {
    return asArray(value).filter((entry) => Boolean(entry && typeof entry === 'object'));
}
function extractImageFromItem(item) {
    // 1. media:content
    const mediaContents = asRecordArray(item['media:content']);
    for (const media of mediaContents) {
        const url = sanitizeUrl(media['@_url']);
        const medium = String(media['@_medium'] ?? '').toLowerCase();
        const type = String(media['@_type'] ?? '').toLowerCase();
        if (url && (!type || type.startsWith('image/') || medium === 'image')) {
            return url;
        }
    }
    // 2. media:thumbnail
    const thumbs = asRecordArray(item['media:thumbnail']);
    for (const thumb of thumbs) {
        const url = sanitizeUrl(thumb['@_url']);
        if (url)
            return url;
    }
    // 3. enclosure
    const enclosures = asRecordArray(item['enclosure']);
    for (const enc of enclosures) {
        const url = sanitizeUrl(enc['@_url']);
        const type = String(enc['@_type'] ?? '').toLowerCase();
        if (url && (!type || type.startsWith('image/'))) {
            return url;
        }
    }
    // 4. Embedded <img src="..."> inside description/content
    const htmlFields = [
        normalizeTextValue(item['content:encoded']),
        normalizeTextValue(item['description']),
        normalizeTextValue(item['summary']),
    ];
    for (const html of htmlFields) {
        const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match?.[1]) {
            const url = sanitizeUrl(match[1]);
            if (url)
                return url;
        }
    }
    return undefined;
}
function extractLinkFromEntry(entry) {
    const linkNode = entry['link'];
    if (typeof linkNode === 'string') {
        return sanitizeUrl(linkNode);
    }
    const links = asArray(linkNode);
    for (const link of links) {
        if (typeof link === 'string') {
            const safe = sanitizeUrl(link);
            if (safe)
                return safe;
        }
        else if (link && typeof link === 'object') {
            const linkRec = link;
            const rel = String(linkRec['@_rel'] ?? 'alternate').toLowerCase();
            const href = sanitizeUrl(linkRec['@_href']);
            if (href && (rel === 'alternate' || rel === '')) {
                return href;
            }
        }
    }
    const fallbackHref = asRecordArray(linkNode).find((l) => sanitizeUrl(l['@_href']));
    if (fallbackHref)
        return sanitizeUrl(fallbackHref['@_href']);
    return sanitizeUrl(normalizeTextValue(entry['guid']));
}
/**
 * Parses an upstream publication timestamp without ever fabricating a date.
 * Returns '' when the source omits a publication date or provides an unparseable value.
 */
function parsePublishedDate(raw) {
    const str = normalizeTextValue(raw).trim();
    if (!str)
        return '';
    const parsed = new Date(str);
    const ms = parsed.getTime();
    if (Number.isNaN(ms) || ms <= 0) {
        return '';
    }
    return parsed.toISOString();
}
function makeStableId(publisher, url, title) {
    const base = `${publisher}|${url}|${title}`.toLowerCase();
    let hash = 2166136261;
    for (let i = 0; i < base.length; i++) {
        hash ^= base.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return `cw-${(hash >>> 0).toString(36)}`;
}
const NON_SCIENCE_NOISE_PATTERN = /\b(black friday|cyber monday|prime day|best deals|save \$\d+|discount code|star trek|star wars|lego set|gift guide|how to watch|streaming guide|box office|sci-fi movie|tv show|blu-ray|4k uhd)\b/i;
export function isNonScienceNoise(title, excerpt) {
    return NON_SCIENCE_NOISE_PATTERN.test(`${title} ${excerpt}`);
}
export function parseRssOrAtomXml(xmlString, publisherName, feedUrl, retrievedAt = new Date().toISOString()) {
    if (!xmlString || typeof xmlString !== 'string')
        return [];
    let parsed;
    try {
        parsed = xmlParser.parse(xmlString);
    }
    catch {
        return [];
    }
    const rssChannel = parsed?.rss?.channel;
    const rdfItems = parsed?.['rdf:RDF']?.item;
    const atomFeed = parsed?.feed;
    const rawItems = rssChannel
        ? asRecordArray(rssChannel.item)
        : rdfItems
            ? asRecordArray(rdfItems)
            : atomFeed
                ? asRecordArray(atomFeed.entry)
                : [];
    const articles = [];
    for (const item of rawItems) {
        if (!item || typeof item !== 'object')
            continue;
        const title = stripHtmlToExcerpt(normalizeTextValue(item.title), 180);
        const url = extractLinkFromEntry(item);
        if (!title || !url)
            continue;
        const rawDesc = normalizeTextValue(item.description) ||
            normalizeTextValue(item.summary) ||
            normalizeTextValue(item['content:encoded']) ||
            normalizeTextValue(item.content);
        const excerpt = stripHtmlToExcerpt(rawDesc, 240) ||
            `Read the original science report published by ${publisherName}.`;
        if (isNonScienceNoise(title, excerpt))
            continue;
        const rawDate = item.pubDate ||
            item.published ||
            item.updated ||
            item['dc:date'] ||
            item['a10:updated'];
        const publishedAt = parsePublishedDate(rawDate);
        const rawCategories = asArray(item.category).map((c) => {
            if (typeof c === 'string')
                return c;
            if (c && typeof c === 'object') {
                return String(c['@_term'] ??
                    c['#text'] ??
                    '');
            }
            return '';
        });
        const category = classifyCategory(title, excerpt, rawCategories);
        const desks = classifyEditorialDesks(title, excerpt, publisherName, category, rawCategories);
        const imageUrl = extractImageFromItem(item);
        const topics = extractTopics(title, excerpt, category);
        articles.push({
            id: makeStableId(publisherName, url, title),
            title,
            excerpt,
            url,
            publisher: publisherName,
            publishedAt,
            retrievedAt,
            category,
            desks,
            topics,
            imageUrl,
            imageAlt: `${title} — ${publisherName}`,
            sourceFeed: feedUrl,
            isSample: false,
        });
    }
    return articles;
}
/**
 * Normalizes articles returned by the documented Spaceflight News API v4 (SNAPI v4)
 * without inventing dates or rewriting publisher attribution.
 */
export function parseSpaceflightNewsApiResponse(payload, sourceFeedUrl, retrievedAt = new Date().toISOString()) {
    if (!payload || typeof payload !== 'object')
        return [];
    const results = payload.results;
    if (!Array.isArray(results))
        return [];
    const articles = [];
    for (const entry of results) {
        if (!entry || typeof entry !== 'object')
            continue;
        const rec = entry;
        const title = stripHtmlToExcerpt(normalizeTextValue(rec.title), 180);
        const url = sanitizeUrl(rec.url);
        const publisherRaw = stripHtmlToExcerpt(normalizeTextValue(rec.news_site), 60);
        const publisher = publisherRaw || 'Spaceflight News Wire';
        if (!title || !url)
            continue;
        const excerpt = stripHtmlToExcerpt(normalizeTextValue(rec.summary), 240) ||
            `Read the original space dispatch published by ${publisher}.`;
        if (isNonScienceNoise(title, excerpt))
            continue;
        const publishedAt = parsePublishedDate(rec.published_at);
        const imageUrl = sanitizeUrl(rec.image_url);
        const category = classifyCategory(title, excerpt);
        const desks = classifyEditorialDesks(title, excerpt, publisher, category);
        const topics = extractTopics(title, excerpt, category);
        articles.push({
            id: makeStableId(publisher, url, title),
            title,
            excerpt,
            url,
            publisher,
            publishedAt,
            retrievedAt,
            category,
            desks,
            topics,
            imageUrl,
            imageAlt: `${title} — ${publisher}`,
            sourceFeed: sourceFeedUrl,
            isSample: false,
        });
    }
    return articles;
}
export function normalizeUrlForDedup(url) {
    try {
        const parsed = new URL(url);
        parsed.hash = '';
        const paramsToDrop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        for (const p of paramsToDrop)
            parsed.searchParams.delete(p);
        return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`.toLowerCase();
    }
    catch {
        return url.trim().toLowerCase();
    }
}
export function normalizeTitleForDedup(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
const DEDUP_STOP_WORDS = new Set([
    'the',
    'a',
    'an',
    'of',
    'to',
    'in',
    'on',
    'for',
    'with',
    'and',
    'or',
    'by',
    'from',
    'at',
    'as',
    'is',
    'are',
    'was',
    'be',
    'new',
    'how',
    'why',
    'what',
    'that',
    'this',
    'its',
    'into',
    'over',
    'about',
    'after',
]);
function extractSignificantTokens(normalizedTitle) {
    const words = normalizedTitle
        .split(' ')
        .filter((w) => w.length >= 3 && !DEDUP_STOP_WORDS.has(w));
    return new Set(words);
}
export function titleTokenSimilarity(titleA, titleB) {
    const setA = extractSignificantTokens(normalizeTitleForDedup(titleA));
    const setB = extractSignificantTokens(normalizeTitleForDedup(titleB));
    if (setA.size < 3 || setB.size < 3)
        return 0;
    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token))
            intersection += 1;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}
function getPublishedTimestampMs(publishedAt) {
    if (!publishedAt)
        return -1;
    const ts = Date.parse(publishedAt);
    if (Number.isNaN(ts) || ts <= 0)
        return -1;
    return ts;
}
export function isValidArticleRecord(article) {
    if (!article || typeof article !== 'object')
        return false;
    if (!article.title?.trim() || !article.publisher?.trim())
        return false;
    if (!sanitizeUrl(article.url))
        return false;
    // Empty string means upstream omitted a publication date (permitted, never fabricated).
    // Non-empty unparseable strings are rejected as malformed data.
    if (article.publishedAt !== '') {
        const ts = Date.parse(article.publishedAt);
        if (Number.isNaN(ts))
            return false;
    }
    return true;
}
export function deduplicateAndSortArticles(articles) {
    const seenUrls = new Set();
    const seenTitles = new Set();
    const keptMeta = [];
    const unique = [];
    const validOnly = articles.filter(isValidArticleRecord);
    // Newest first (undated items always placed after dated items); tie-break in favor of imagery
    const preSorted = [...validOnly].sort((a, b) => {
        const ta = getPublishedTimestampMs(a.publishedAt);
        const tb = getPublishedTimestampMs(b.publishedAt);
        if (tb !== ta)
            return tb - ta;
        const imgScore = (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0);
        return imgScore;
    });
    const NEAR_DUP_WINDOW_MS = 72 * 60 * 60 * 1000;
    for (const article of preSorted) {
        const normUrl = normalizeUrlForDedup(article.url);
        const normTitle = normalizeTitleForDedup(article.title);
        if (!normUrl || !normTitle)
            continue;
        if (seenUrls.has(normUrl) || seenTitles.has(normTitle))
            continue;
        const ts = getPublishedTimestampMs(article.publishedAt);
        const tokens = extractSignificantTokens(normTitle);
        let isNearDuplicate = false;
        if (tokens.size >= 4) {
            for (const prev of keptMeta) {
                if (ts > 0 && prev.ts > 0 && Math.abs(prev.ts - ts) > NEAR_DUP_WINDOW_MS)
                    continue;
                if (prev.tokens.size < 4)
                    continue;
                let overlap = 0;
                for (const t of tokens) {
                    if (prev.tokens.has(t))
                        overlap += 1;
                }
                const union = tokens.size + prev.tokens.size - overlap;
                if (union > 0 && overlap / union >= 0.76) {
                    isNearDuplicate = true;
                    break;
                }
            }
        }
        if (isNearDuplicate)
            continue;
        seenUrls.add(normUrl);
        seenTitles.add(normTitle);
        keptMeta.push({ tokens, ts });
        const enrichedDesks = classifyEditorialDesks(article.title, article.excerpt, article.publisher, article.category);
        unique.push({
            ...article,
            desks: enrichedDesks,
        });
    }
    return unique;
}
export function filterAndSearchArticles(articles, options = {}) {
    const { query = '', category = 'All', categories, desk = 'All', publisher = 'All', sort = 'newest', } = options;
    const q = query.trim().toLowerCase();
    const filtered = articles.filter((article) => {
        if (categories && categories.length > 0) {
            if (!categories.includes(article.category))
                return false;
        }
        else if (category !== 'All' && article.category !== category) {
            return false;
        }
        if (desk !== 'All') {
            const articleDesks = article.desks && article.desks.length > 0
                ? article.desks
                : classifyEditorialDesks(article.title, article.excerpt, article.publisher, article.category);
            if (!articleDesks.includes(desk))
                return false;
        }
        if (publisher !== 'All' && article.publisher.toLowerCase() !== publisher.toLowerCase()) {
            return false;
        }
        if (q) {
            const deskStr = (article.desks ?? []).join(' ');
            const haystack = `${article.title} ${article.excerpt} ${article.publisher} ${article.category} ${deskStr} ${article.topics.join(' ')}`.toLowerCase();
            const tokens = q.split(/\s+/).filter(Boolean);
            if (!tokens.every((token) => haystack.includes(token))) {
                return false;
            }
        }
        return true;
    });
    return filtered.sort((a, b) => {
        const ta = getPublishedTimestampMs(a.publishedAt);
        const tb = getPublishedTimestampMs(b.publishedAt);
        if (ta === -1 && tb === -1)
            return 0;
        if (ta === -1)
            return 1;
        if (tb === -1)
            return -1;
        return sort === 'oldest' ? ta - tb : tb - ta;
    });
}
export function paginateArticles(articles, rawPage = 1, rawLimit = 18) {
    const total = articles.length;
    const limit = Math.min(100, Math.max(1, Math.floor(Number.isFinite(rawLimit) ? rawLimit : 18)));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(totalPages, Math.max(1, Math.floor(Number.isFinite(rawPage) ? rawPage : 1)));
    const start = (page - 1) * limit;
    const items = articles.slice(start, start + limit);
    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
        },
    };
}
export function isValidCategory(value) {
    return NEWS_CATEGORIES.includes(value);
}
export function filterCosmicEvents(events, options = {}) {
    const { type = 'All', onlyUpcoming = false, referenceDate = new Date() } = options;
    const refTime = referenceDate.getTime() - 24 * 60 * 60 * 1000;
    return [...events]
        .filter((event) => {
        if (type !== 'All' && event.type !== type)
            return false;
        if (onlyUpcoming && new Date(event.utcDate).getTime() < refTime)
            return false;
        return true;
    })
        .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
}
export function formatDateTimeLocal(isoDate, includeTime = false) {
    if (!isoDate)
        return 'Date unavailable';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime()) || date.getTime() <= 0) {
        return 'Date unavailable';
    }
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...(includeTime ? { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' } : {}),
        }).format(date);
    }
    catch {
        return date.toISOString().slice(0, 10);
    }
}
export function formatUtcTimestamp(isoDate, includeTime = true) {
    if (!isoDate)
        return 'Publication date unavailable';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime()) || date.getTime() <= 0)
        return 'Publication date unavailable';
    try {
        return (new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
            timeZone: 'UTC',
        }).format(date) + (includeTime ? ' UTC' : ' (UTC)'));
    }
    catch {
        return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
    }
}
