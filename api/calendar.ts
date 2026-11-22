import type { ServerResponse } from 'node:http';
import {
  enforceMethod,
  getSearchParams,
  sendJson,
  type ServerlessRequest,
} from '../server/vercelHttp.js';
import { VERIFIED_COSMIC_EVENTS } from '../src/data/cosmicCalendar.js';
import type { CosmicEventType } from '../src/types.js';
import { filterCosmicEvents } from '../src/utils/newsLogic.js';

export default function handler(
  req: ServerlessRequest,
  res: ServerResponse
): void {
  if (!enforceMethod(req, res, ['GET'])) {
    return;
  }

  try {
    const params = getSearchParams(req);
    const typeParam = params.get('type') || 'All';
    const onlyUpcoming = params.get('upcoming') === '1';
    const events = filterCosmicEvents(VERIFIED_COSMIC_EVENTS, {
      type: typeParam as CosmicEventType | 'All',
      onlyUpcoming,
    });

    sendJson(
      res,
      200,
      {
        events,
        total: events.length,
        sources: [
          'NASA Goddard Eclipse Website',
          'U.S. Naval Observatory (USNO)',
          'International Meteor Organization (IMO)',
          'NASA JPL Solar System Ephemeris',
        ],
      },
      'public, max-age=300, s-maxage=3600'
    );
  } catch (error) {
    console.error('[VercelAPI:/api/calendar] Failed to serve cosmic calendar:', error);
    sendJson(res, 500, {
      error: 'Unable to retrieve cosmic calendar events at this time.',
    });
  }
}
