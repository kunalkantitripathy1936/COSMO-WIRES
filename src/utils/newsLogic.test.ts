import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyCategory,
  classifyEditorialDesks,
  deduplicateAndSortArticles,
  filterAndSearchArticles,
  filterCosmicEvents,
  paginateArticles,
  parseRssOrAtomXml,
  parseSpaceflightNewsApiResponse,
  sanitizeEmbedUrl,
  sanitizeUrl,
  stripHtmlToExcerpt,
  titleTokenSimilarity,
} from './newsLogic';
import { Article, CosmicEvent } from '../types';

test('sanitizeUrl permits http/https and rejects javascript/data schemes', () => {
  assert.equal(sanitizeUrl('https://www.nasa.gov/news/article'), 'https://www.nasa.gov/news/article');
  assert.equal(sanitizeUrl('http://esa.int/test'), 'http://esa.int/test');
  assert.equal(sanitizeUrl('javascript:alert(1)'), undefined);
  assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), undefined);
  assert.equal(sanitizeUrl('not-a-url'), undefined);
});

test('sanitizeEmbedUrl restricts embeds to approved video hosts', () => {
  assert.equal(
    sanitizeEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'),
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
  );
  assert.equal(sanitizeEmbedUrl('https://evil.example.com/embed/123'), undefined);
});

test('stripHtmlToExcerpt removes tags, scripts, and decodes entities safely', () => {
  const input = '<p>James Webb detected <strong>CO&amp;2</strong> &mdash; <script>alert(1)</script> on K2-18b.</p>';
  const cleaned = stripHtmlToExcerpt(input, 200);
  assert.equal(cleaned.includes('<script>'), false);
  assert.equal(cleaned.includes('<strong>'), false);
  assert.equal(cleaned.includes('CO&2'), true);
});

test('classifyCategory routes scientific topics accurately', () => {
  assert.equal(classifyCategory('Event Horizon Telescope images supermassive black hole jet', ''), 'Black Holes');
  assert.equal(classifyCategory('TESS discovers temperate exoplanet in habitable zone', ''), 'Exoplanets');
  assert.equal(classifyCategory('Ariane 6 rocket completes orbital launch vehicle test', ''), 'Rocket Science');
  assert.equal(classifyCategory('Dark energy measurements challenge Lambda-CDM cosmology', ''), 'Cosmology');
});

test('classifyEditorialDesks assigns all 10 space-science and agency desks accurately', () => {
  const isroDesks = classifyEditorialDesks(
    'ISRO Aditya-L1 solar observatory captures coronal mass ejection',
    'Indian Space Research Organisation spacecraft mission instruments detect flare.',
    'SpaceNews',
    'Solar System'
  );
  assert.equal(isroDesks.includes('ISRO'), true);
  assert.equal(isroDesks.includes('Space Missions'), true);

  const esaDesks = classifyEditorialDesks(
    'ESA Euclid telescope reveals new dark matter cosmic web map',
    'Cosmologists discover giant filaments in early universe.',
    'ESA',
    'Cosmology'
  );
  assert.equal(esaDesks.includes('ESA'), true);
  assert.equal(esaDesks.includes('Cosmology'), true);
  assert.equal(esaDesks.includes('Scientific Discoveries'), true);

  const bhDesks = classifyEditorialDesks(
    'Event Horizon Telescope resolves relativistic black hole accretion ring',
    'Astrophysicists confirm magnetized plasma jets.',
    'NASA',
    'Black Holes'
  );
  assert.equal(bhDesks.includes('NASA'), true);
  assert.equal(bhDesks.includes('Black Holes'), true);
  assert.equal(bhDesks.includes('Astrophysics'), true);

  const exoDesks = classifyEditorialDesks(
    'TESS detects habitable-zone exoplanet orbiting nearby red dwarf',
    'Astronomers discover water vapor candidate.',
    'Universe Today',
    'Exoplanets'
  );
  assert.equal(exoDesks.includes('Exoplanets'), true);
  assert.equal(exoDesks.includes('Astronomy'), true);
});

test('parseRssOrAtomXml parses RSS 2.0 and Atom feeds with media extraction, retrievedAt, and honest missing dates', () => {
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
    <channel>
      <title>NASA</title>
      <item>
        <title>Webb Observes Distant Spiral Galaxy</title>
        <link>https://www.nasa.gov/webb-galaxy?utm_source=rss</link>
        <description><![CDATA[<p>New infrared data reveals star formation across spiral arms.</p>]]></description>
        <pubDate>Fri, 20 Nov 2026 14:00:00 GMT</pubDate>
        <media:content url="https://www.nasa.gov/images/galaxy.jpg" medium="image" />
      </item>
      <item>
        <title>Undated Observatory Bulletin</title>
        <link>https://www.nasa.gov/undated-bulletin</link>
        <description>An observatory update without a pubDate element.</description>
      </item>
    </channel>
  </rss>`;

  const retrievedIso = '2026-11-21T23:00:00.000Z';
  const articles = parseRssOrAtomXml(rssXml, 'NASA', 'https://www.nasa.gov/rss', retrievedIso);
  assert.equal(articles.length, 2);
  assert.equal(articles[0].publisher, 'NASA');
  assert.equal(articles[0].category, 'Galaxies');
  assert.equal(articles[0].desks?.includes('NASA'), true);
  assert.equal(articles[0].retrievedAt, retrievedIso);
  assert.equal(articles[0].imageUrl, 'https://www.nasa.gov/images/galaxy.jpg');
  assert.equal(articles[0].isSample, false);
  // Missing pubDate is never fabricated
  assert.equal(articles[1].publishedAt, '');
  assert.equal(articles[1].retrievedAt, retrievedIso);

  const atomXml = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <title>Pulsar Timing Array Detects Low-Frequency Gravitational Background</title>
      <link rel="alternate" href="https://phys.org/news/pulsar-array.html" />
      <summary>Millisecond pulsars show correlated timing residuals across the sky.</summary>
      <updated>2026-11-19T08:30:00Z</updated>
    </entry>
  </feed>`;

  const atomArticles = parseRssOrAtomXml(atomXml, 'Phys.org', 'https://phys.org/rss');
  assert.equal(atomArticles.length, 1);
  assert.equal(atomArticles[0].category, 'Astrophysics');
  assert.equal(atomArticles[0].url, 'https://phys.org/news/pulsar-array.html');
});

test('parseSpaceflightNewsApiResponse normalizes SNAPI v4 JSON and rejects unsafe links', () => {
  const payload = {
    results: [
      {
        title: 'ESA and ISRO extend Gaganyaan orbital tracking cooperation',
        url: 'https://spacenews.com/esa-isro-cooperation',
        image_url: 'https://spacenews.com/img/isro.jpg',
        news_site: 'SpaceNews',
        summary: 'European and Indian space agencies expand deep-space ground station support.',
        published_at: '2026-11-20T18:45:00Z',
      },
      {
        title: 'Invalid Entry With Javascript Link',
        url: 'javascript:alert(1)',
        news_site: 'BadSource',
        summary: 'Should be rejected.',
        published_at: '2026-11-20T18:00:00Z',
      },
    ],
  };

  const parsed = parseSpaceflightNewsApiResponse(payload, 'https://api.spaceflightnewsapi.net/v4/articles/');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].publisher, 'SpaceNews');
  assert.equal(parsed[0].publishedAt, '2026-11-20T18:45:00.000Z');
  assert.equal(parsed[0].desks?.includes('ISRO'), true);
  assert.equal(parsed[0].desks?.includes('ESA'), true);
});

test('deduplicateAndSortArticles eliminates URL/UTM, exact title, cross-source near-duplicates, and invalid records', () => {
  const base: Article[] = [
    {
      id: '1',
      title: 'NASA Perseverance Mars Rover Analyzes Ancient Jezero Crater Core Sample',
      excerpt: 'Sample details',
      url: 'https://www.nasa.gov/mars-core?utm_source=feed',
      publisher: 'NASA',
      publishedAt: '2026-11-18T10:00:00Z',
      category: 'Solar System',
      topics: ['Mars'],
      imageUrl: 'https://www.nasa.gov/mars.jpg',
      sourceFeed: 'nasa',
      isSample: false,
    },
    {
      id: '2',
      title: 'NASA Perseverance Mars Rover Analyzes Ancient Jezero Crater Core Sample!',
      excerpt: 'Exact URL/title duplicate item',
      url: 'https://nasa.gov/mars-core/',
      publisher: 'NASA',
      publishedAt: '2026-11-18T09:00:00Z',
      category: 'Solar System',
      topics: ['Mars'],
      sourceFeed: 'nasa',
      isSample: false,
    },
    {
      id: '2b',
      title: 'Perseverance Mars Rover Analyzes Ancient Jezero Crater Core Sample for NASA',
      excerpt: 'Syndicated cross-publisher near duplicate',
      url: 'https://phys.org/news/perseverance-jezero-core.html',
      publisher: 'Phys.org',
      publishedAt: '2026-11-18T08:30:00Z',
      category: 'Solar System',
      topics: ['Mars'],
      sourceFeed: 'phys',
      isSample: false,
    },
    {
      id: '3',
      title: 'Black Hole Jet Measured in M87',
      excerpt: 'New VLBI analysis',
      url: 'https://www.esa.int/m87-jet',
      publisher: 'ESA',
      publishedAt: '2026-11-20T12:00:00Z',
      category: 'Black Holes',
      topics: ['Black Holes'],
      sourceFeed: 'esa',
      isSample: false,
    },
    {
      id: 'invalid-date',
      title: 'Malformed Timestamp Article',
      excerpt: 'Invalid date should be discarded',
      url: 'https://example.org/invalid',
      publisher: 'Unknown',
      publishedAt: 'not-a-timestamp',
      category: 'Astronomy',
      topics: [],
      sourceFeed: 'feed',
      isSample: false,
    },
  ];

  assert.equal(
    titleTokenSimilarity(
      'NASA Perseverance Mars Rover Analyzes Ancient Jezero Crater Core Sample',
      'Perseverance Mars Rover Analyzes Ancient Jezero Crater Core Sample for NASA'
    ) >= 0.76,
    true
  );

  const deduped = deduplicateAndSortArticles(base);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].id, '3');
  assert.equal(deduped[1].id, '1');
});

test('filterAndSearchArticles filters by desk, query, category, publisher, and paginateArticles slices cleanly', () => {
  const sample: Article[] = [
    {
      id: 'a',
      title: 'Exoplanet Atmosphere Shows Methane Signatures',
      excerpt: 'Infrared transmission spectrum from JWST.',
      url: 'https://example.org/a',
      publisher: 'NASA',
      publishedAt: '2026-11-10T00:00:00Z',
      category: 'Exoplanets',
      desks: ['NASA', 'Astronomy', 'Exoplanets', 'Scientific Discoveries'],
      topics: ['JWST', 'Exoplanets'],
      sourceFeed: 'feed',
      isSample: false,
    },
    {
      id: 'b',
      title: 'Euclid Maps Dark Matter Filaments',
      excerpt: 'Weak gravitational lensing survey across deep sky.',
      url: 'https://example.org/b',
      publisher: 'ESA',
      publishedAt: '2026-11-20T00:00:00Z',
      category: 'Cosmology',
      desks: ['ESA', 'Cosmology', 'Scientific Discoveries'],
      topics: ['Dark Matter'],
      sourceFeed: 'feed',
      isSample: false,
    },
    {
      id: 'c',
      title: 'ISRO Chandrayaan Lunar South Pole Data Released',
      excerpt: 'Surface spectrometer measurements published.',
      url: 'https://example.org/c',
      publisher: 'SpaceNews',
      publishedAt: '2026-11-15T00:00:00Z',
      category: 'Space Exploration',
      desks: ['ISRO', 'Space Missions'],
      topics: ['Lunar'],
      sourceFeed: 'feed',
      isSample: false,
    },
  ];

  assert.equal(filterAndSearchArticles(sample, { query: 'methane jwst' }).length, 1);
  assert.equal(filterAndSearchArticles(sample, { desk: 'ISRO' })[0].id, 'c');
  assert.equal(filterAndSearchArticles(sample, { desk: 'Exoplanets' })[0].id, 'a');
  assert.equal(filterAndSearchArticles(sample, { publisher: 'ESA' })[0].id, 'b');
  assert.equal(filterAndSearchArticles(sample, { sort: 'oldest' })[0].id, 'a');

  const page1 = paginateArticles(sample, 1, 2);
  assert.equal(page1.items.length, 2);
  assert.equal(page1.pagination.total, 3);
  assert.equal(page1.pagination.totalPages, 2);
  assert.equal(page1.pagination.hasMore, true);

  const page2 = paginateArticles(sample, 2, 2);
  assert.equal(page2.items.length, 1);
  assert.equal(page2.pagination.hasMore, false);
});

test('filterCosmicEvents filters upcoming events by type and chronological order', () => {
  const events: CosmicEvent[] = [
    {
      id: 'past',
      title: 'Past Event',
      type: 'Moon Phase',
      utcDate: '2025-01-01T00:00:00Z',
      datePrecision: 'exact-utc',
      visibility: 'Global',
      description: 'Past',
      sourceReference: 'USNO',
      sourceUrl: 'https://aa.usno.navy.mil',
    },
    {
      id: 'future-2',
      title: 'Total Solar Eclipse',
      type: 'Solar Eclipse',
      utcDate: '2027-08-02T10:07:00Z',
      datePrecision: 'exact-utc',
      visibility: 'North Africa',
      description: 'Totality',
      sourceReference: 'NASA',
      sourceUrl: 'https://eclipse.gsfc.nasa.gov',
    },
    {
      id: 'future-1',
      title: 'Geminid Meteor Shower Peak',
      type: 'Meteor Shower',
      utcDate: '2026-12-14T02:00:00Z',
      datePrecision: 'exact-utc',
      visibility: 'Global',
      description: 'Peak',
      sourceReference: 'IMO',
      sourceUrl: 'https://www.imo.net',
    },
  ];

  const upcoming = filterCosmicEvents(events, {
    onlyUpcoming: true,
    referenceDate: new Date('2026-11-21T12:00:00Z'),
  });
  assert.equal(upcoming.length, 2);
  assert.equal(upcoming[0].id, 'future-1');
  assert.equal(upcoming[1].id, 'future-2');
});

test('parseRssOrAtomXml filters out non-science entertainment and shopping deals', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <item>
        <title>Best Black Friday Lego Set Deals for Star Wars Fans</title>
        <link>https://example.com/deals</link>
        <description>Save $50 on this holiday gift guide.</description>
      </item>
      <item>
        <title>Euclid Telescope Captures Gravitational Lensing Arc</title>
        <link>https://example.com/euclid</link>
        <description>Deep-sky cosmology survey maps dark matter halos.</description>
      </item>
    </channel>
  </rss>`;
  const parsed = parseRssOrAtomXml(xml, 'Space.com', 'https://space.com/feed');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Euclid Telescope Captures Gravitational Lensing Arc');
});
