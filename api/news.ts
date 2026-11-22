import type { ServerResponse } from 'node:http';
import { getAggregatedNews } from '../server/newsAggregator.js';
import {
  enforceMethod,
  getSearchParams,
  isRateLimited,
  sendJson,
  type ServerlessRequest,
} from '../server/vercelHttp.js';
import {
  filterAndSearchArticles,
  isValidCategory,
  isValidEditorialDesk,
  paginateArticles,
} from '../src/utils/newsLogic.js';

export default async function handler(
  req: ServerlessRequest,
  res: ServerResponse
): Promise<void> {
  if (!enforceMethod(req, res, ['GET'])) {
    return;
  }

  if (isRateLimited(req, 'news', 60, 60_000)) {
    sendJson(res, 429, {
      error: 'Too many requests. Please wait a moment and try again.',
    });
    return;
  }

  try {
    const params = getSearchParams(req);
    const forceRefresh = params.get('refresh') === '1';
    const data = await getAggregatedNews(forceRefresh);

    const q = (params.get('q') || '').slice(0, 120);
    const categoryParam = params.get('category') || 'All';
    const category =
      categoryParam !== 'All' && isValidCategory(categoryParam) ? categoryParam : 'All';
    const deskParam = params.get('desk') || 'All';
    const desk = deskParam !== 'All' && isValidEditorialDesk(deskParam) ? deskParam : 'All';
    const publisherRaw = (params.get('publisher') || '').trim();
    const publisher = publisherRaw ? publisherRaw.slice(0, 80) : 'All';
    const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';

    const filtered = filterAndSearchArticles(data.articles, {
      query: q,
      category,
      desk,
      publisher,
      sort,
    });

    const cacheControl = forceRefresh
      ? 'no-store, max-age=0'
      : 'public, max-age=60, s-maxage=900, stale-while-revalidate=300';

    const hasPaginationParams = params.has('page') || params.has('limit');
    if (hasPaginationParams) {
      const rawPage = Number(params.get('page') ?? 1);
      const rawLimit = Number(params.get('limit') ?? 18);
      const { items, pagination } = paginateArticles(filtered, rawPage, rawLimit);
      sendJson(
        res,
        200,
        {
          ...data,
          articles: items,
          total: filtered.length,
          pagination,
        },
        cacheControl
      );
      return;
    }

    sendJson(
      res,
      200,
      {
        ...data,
        articles: filtered,
        total: filtered.length,
      },
      cacheControl
    );
  } catch (error) {
    console.error('[VercelAPI:/api/news] Failed to serve space news:', error);
    sendJson(res, 500, {
      error: 'Unable to retrieve space news feeds at this time.',
    });
  }
}
