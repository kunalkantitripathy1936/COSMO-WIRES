import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  getAggregatedNews,
  getNewsHealthSummary,
  startScheduledNewsRefresh,
} from './server/newsAggregator';
import { getNasaApod } from './server/apodService';
import { generateCosmicExplanation } from './server/explainerService';
import {
  ContactRequestError,
  submitContactInquiry,
} from './server/storageService';
import { EmailDeliveryError, isEmailTransportConfigured } from './server/emailService';
import { CONTACT_ERROR_MESSAGE } from './src/utils/contactLogic';
import {
  filterAndSearchArticles,
  filterCosmicEvents,
  isValidCategory,
  isValidEditorialDesk,
  paginateArticles,
} from './src/utils/newsLogic';
import { VERIFIED_COSMIC_EVENTS } from './src/data/cosmicCalendar';
import { BRAND } from './src/config/brand';
import { CosmicEventType } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Lightweight per-IP rate limiter for write & AI endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
      });
      return;
    }
    bucket.count += 1;
    next();
  };
}

function getBaseUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL' && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  const host = req.get('host') || `localhost:${PORT}`;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

async function startServer(): Promise<void> {
  const app = express();
  const httpServer = http.createServer(app);
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  // SEO: robots.txt & sitemap.xml
  app.get('/robots.txt', (req, res) => {
    const baseUrl = getBaseUrl(req);
    res
      .type('text/plain')
      .send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = getBaseUrl(req);
    const routes = [
      '/',
      '/latest-news',
      '/astronomy',
      '/astrophysics',
      '/space-missions',
      '/discoveries',
      '/cosmic-calendar',
      '/about',
      '/contact',
      '/editorial-policy',
      '/disclaimer',
      '/privacy',
      '/terms',
    ];
    const lastMod = new Date().toISOString().slice(0, 10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${route === '/' || route === '/latest-news' ? 'hourly' : 'weekly'}</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  // API: Service health & live news scheduler status
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: BRAND.serviceId,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      news: getNewsHealthSummary(),
      contactEmailConfigured: isEmailTransportConfigured(),
    });
  });

  // API: Real aggregated space news with desk/category/publisher filtering & optional server-side pagination
  app.get('/api/news', rateLimit(60, 60_000), async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === '1';
      const data = await getAggregatedNews(forceRefresh);

      const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : '';
      const categoryParam = typeof req.query.category === 'string' ? req.query.category : 'All';
      const category =
        categoryParam !== 'All' && isValidCategory(categoryParam) ? categoryParam : 'All';
      const deskParam = typeof req.query.desk === 'string' ? req.query.desk : 'All';
      const desk = deskParam !== 'All' && isValidEditorialDesk(deskParam) ? deskParam : 'All';
      const publisher =
        typeof req.query.publisher === 'string' && req.query.publisher.trim()
          ? req.query.publisher.trim().slice(0, 80)
          : 'All';
      const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';

      const filtered = filterAndSearchArticles(data.articles, {
        query: q,
        category,
        desk,
        publisher,
        sort,
      });

      const hasPaginationParams = req.query.page !== undefined || req.query.limit !== undefined;
      if (hasPaginationParams) {
        const rawPage = Number(req.query.page ?? 1);
        const rawLimit = Number(req.query.limit ?? 18);
        const { items, pagination } = paginateArticles(filtered, rawPage, rawLimit);
        res.json({
          ...data,
          articles: items,
          total: filtered.length,
          pagination,
        });
        return;
      }

      res.json({
        ...data,
        articles: filtered,
        total: filtered.length,
      });
    } catch (error) {
      console.error('Error serving /api/news:', error);
      res.status(500).json({ error: 'Unable to retrieve space news feeds at this time.' });
    }
  });

  // API: NASA Astronomy Picture of the Day
  app.get('/api/apod', async (req, res) => {
    try {
      const dateParam = typeof req.query.date === 'string' ? req.query.date : undefined;
      const apod = await getNasaApod(dateParam);
      res.json(apod);
    } catch (error) {
      console.error('Error serving /api/apod:', error);
      res.status(500).json({ error: 'Unable to load NASA Astronomy Picture of the Day.' });
    }
  });

  // API: Verified Cosmic Calendar events
  app.get('/api/calendar', (req, res) => {
    const typeParam = typeof req.query.type === 'string' ? req.query.type : 'All';
    const onlyUpcoming = req.query.upcoming === '1';
    const events = filterCosmicEvents(VERIFIED_COSMIC_EVENTS, {
      type: typeParam as CosmicEventType | 'All',
      onlyUpcoming,
    });
    res.json({
      events,
      total: events.length,
      sources: [
        'NASA Goddard Eclipse Website',
        'U.S. Naval Observatory (USNO)',
        'International Meteor Organization (IMO)',
        'NASA JPL Solar System Ephemeris',
      ],
    });
  });

  // API: Gemini-powered Cosmic Explainer (server-side only)
  app.post('/api/explainer', rateLimit(20, 60_000), async (req, res) => {
    try {
      const result = await generateCosmicExplanation(req.body);
      res.json(result);
    } catch (error) {
      const err = error as Error & { status?: number };
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = err.message || 'Cosmic Explainer encountered an upstream error.';
      console.error('Error serving /api/explainer:', message);
      res.status(status).json({ error: message });
    }
  });

  // API: Contact Us Form (server-side email delivery to cosmowires.connect@gmail.com)
  app.post('/api/contact', rateLimit(5, 60_000), async (req, res) => {
    try {
      const result = await submitContactInquiry(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ContactRequestError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
          fieldErrors: error.fieldErrors,
        });
        return;
      }
      if (error instanceof EmailDeliveryError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      console.error('[ContactAPI] Unexpected error:', error);
      res.status(500).json({
        error: CONTACT_ERROR_MESSAGE,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Mount Vite middleware in dev or serve static dist in production
  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`${BRAND.name} server running at http://localhost:${PORT}`);
    startScheduledNewsRefresh();
  });
}

void startServer();
