import { CosmicEvent } from '../types';

/**
 * Verified astronomical ephemerides for 2026–2027 sourced from:
 * - NASA Goddard Eclipse Website (eclipse.gsfc.nasa.gov)
 * - U.S. Naval Observatory Astronomical Applications (aa.usno.navy.mil)
 * - International Meteor Organization (imo.net)
 * - NASA / ESA Mission Schedules
 */
export const VERIFIED_COSMIC_EVENTS: CosmicEvent[] = [
  {
    id: 'full-beaver-moon-2026',
    title: 'Full Beaver Moon',
    type: 'Moon Phase',
    utcDate: '2026-11-24T14:53:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Visible worldwide after local sunset',
    description:
      'The November Full Moon reaches peak illumination while near lunar perigee, appearing subtly larger and brighter against the constellation Taurus.',
    sourceReference: 'U.S. Naval Observatory (USNO)',
    sourceUrl: 'https://aa.usno.navy.mil/data/MoonPhases',
  },
  {
    id: 'geminids-2026',
    title: 'Geminid Meteor Shower Peak',
    type: 'Meteor Shower',
    utcDate: '2026-12-14T02:00:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Global; optimal viewing from Northern Hemisphere skies after 22:00 local time',
    description:
      'Originating from rocky asteroid 3200 Phaethon rather than a comet, the Geminids reliably produce up to 120 meteors per hour under dark skies during maximum.',
    sourceReference: 'International Meteor Organization (IMO)',
    sourceUrl: 'https://www.imo.net/resources/calendar/',
  },
  {
    id: 'december-solstice-2026',
    title: 'December Solstice',
    type: 'Astronomical Event',
    utcDate: '2026-12-21T20:50:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Global astronomical epoch',
    description:
      'The Sun reaches its southernmost declination directly overhead at the Tropic of Capricorn, marking the astronomical start of Northern Hemisphere winter and Southern Hemisphere summer.',
    sourceReference: 'U.S. Naval Observatory (USNO)',
    sourceUrl: 'https://aa.usno.navy.mil/data/Earth_Seasons',
  },
  {
    id: 'full-cold-moon-2026',
    title: 'Full Cold Moon (Perigee Full Moon)',
    type: 'Moon Phase',
    utcDate: '2026-12-24T01:28:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Visible worldwide during local night hours',
    description:
      'The final full moon of 2026 rises high along the ecliptic in the Northern Hemisphere, remaining above the horizon for the longest nights of the year.',
    sourceReference: 'U.S. Naval Observatory (USNO)',
    sourceUrl: 'https://aa.usno.navy.mil/data/MoonPhases',
  },
  {
    id: 'quadrantids-2027',
    title: 'Quadrantid Meteor Shower Peak',
    type: 'Meteor Shower',
    utcDate: '2027-01-03T22:00:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Best viewed from Northern Hemisphere latitudes with dark pre-dawn skies',
    description:
      'Associated with asteroid 2003 EH1, the Quadrantids feature an unusually narrow 6-hour maximum capable of producing bright fireball meteors radiating from Boötes.',
    sourceReference: 'International Meteor Organization (IMO)',
    sourceUrl: 'https://www.imo.net/resources/calendar/',
  },
  {
    id: 'annular-solar-eclipse-2027',
    title: 'Annular Solar Eclipse ("Ring of Fire")',
    type: 'Solar Eclipse',
    utcDate: '2027-02-06T16:00:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Annularity path crosses Chile, Argentina, South Atlantic, and West Africa; partial across South America and West/Southern Africa',
    description:
      'Because the Moon lies near apogee, its apparent angular diameter is smaller than the Sun, leaving a luminous solar annulus lasting up to 7 minutes 51 seconds at greatest eclipse.',
    sourceReference: 'NASA Goddard Eclipse Website',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html',
  },
  {
    id: 'mars-opposition-2027',
    title: 'Mars at Opposition',
    type: 'Planetary Conjunction',
    utcDate: '2027-02-19T15:00:00Z',
    datePrecision: 'date-only',
    visibility: 'Visible all night worldwide in the constellation Leo',
    description:
      'Earth passes directly between the Sun and Mars, bringing the Red Planet to its brightest apparent magnitude and highest nighttime visibility of the 2026–2027 synodic cycle.',
    sourceReference: 'NASA JPL Solar System Ephemeris',
    sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
  },
  {
    id: 'penumbral-lunar-eclipse-2027',
    title: 'Deep Penumbral Lunar Eclipse',
    type: 'Lunar Eclipse',
    utcDate: '2027-02-20T23:14:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Americas, Europe, Africa, and Western Asia',
    description:
      'The Full Moon glides nearly completely through Earth’s outer penumbral shadow, producing a subtle coppery shading across the northern lunar limb around greatest eclipse.',
    sourceReference: 'NASA Goddard Eclipse Website',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html',
  },
  {
    id: 'march-equinox-2027',
    title: 'March Vernal Equinox',
    type: 'Astronomical Event',
    utcDate: '2027-03-20T18:24:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Global astronomical epoch',
    description:
      'The Sun crosses the celestial equator heading northward, bringing nearly equal day and night lengths across Earth.',
    sourceReference: 'U.S. Naval Observatory (USNO)',
    sourceUrl: 'https://aa.usno.navy.mil/data/Earth_Seasons',
  },
  {
    id: 'lyrid-meteors-2027',
    title: 'Lyrid Meteor Shower Peak',
    type: 'Meteor Shower',
    utcDate: '2027-04-22T18:00:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Global; strongest from Northern Hemisphere skies',
    description:
      'One of the oldest recorded meteor showers (observed since 687 BCE), generated by dust trails shed along the orbit of long-period Comet C/1861 G1 (Thatcher).',
    sourceReference: 'International Meteor Organization (IMO)',
    sourceUrl: 'https://www.imo.net/resources/calendar/',
  },
  {
    id: 'roman-space-telescope-window-2027',
    title: 'Nancy Grace Roman Space Telescope Launch Window',
    type: 'Space Launch',
    utcDate: '2027-05-01T00:00:00Z',
    datePrecision: 'date-only',
    visibility: 'Launch scheduled from Kennedy Space Center (Falcon Heavy) to Sun–Earth L2',
    description:
      'NASA’s flagship wide-field infrared observatory (target no later than May 2027) carries a 2.4-meter primary mirror with a field of view 100 times wider than Hubble to survey dark energy and exoplanets.',
    sourceReference: 'NASA Goddard Space Flight Center',
    sourceUrl: 'https://roman.gsfc.nasa.gov/',
  },
  {
    id: 'eta-aquariids-2027',
    title: 'Eta Aquariid Meteor Shower Peak',
    type: 'Meteor Shower',
    utcDate: '2027-05-06T03:00:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Favored in Southern Hemisphere and equatorial latitudes before dawn',
    description:
      'Fast atmospheric entry meteors originating from Comet 1P/Halley, frequently leaving persistent ionized dust trains across pre-dawn eastern skies.',
    sourceReference: 'International Meteor Organization (IMO)',
    sourceUrl: 'https://www.imo.net/resources/calendar/',
  },
  {
    id: 'june-solstice-2027',
    title: 'June Solstice',
    type: 'Astronomical Event',
    utcDate: '2027-06-21T12:10:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Global astronomical epoch',
    description:
      'The Sun reaches its northernmost excursion over the Tropic of Cancer, marking the astronomical start of Northern Hemisphere summer and Southern Hemisphere winter.',
    sourceReference: 'U.S. Naval Observatory (USNO)',
    sourceUrl: 'https://aa.usno.navy.mil/data/Earth_Seasons',
  },
  {
    id: 'total-solar-eclipse-2027',
    title: 'Total Solar Eclipse of August 2027',
    type: 'Solar Eclipse',
    utcDate: '2027-08-02T10:07:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Totality crosses southern Spain, Morocco, Algeria, Tunisia, Libya, Egypt (6m 22s near Luxor), Saudi Arabia, Yemen, and Somalia',
    description:
      'The longest land-visible total solar eclipse of the 21st century. At greatest eclipse near Luxor, Egypt, the solar corona will remain visible to the unaided eye for over six minutes.',
    sourceReference: 'NASA Goddard Eclipse Website',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html',
  },
  {
    id: 'perseids-2027',
    title: 'Perseid Meteor Shower Peak',
    type: 'Meteor Shower',
    utcDate: '2027-08-13T02:00:00Z',
    datePrecision: 'exact-utc',
    visibility: 'Northern Hemisphere skies; best after midnight local time',
    description:
      'Caused by Earth sweeping through debris left by Comet 109P/Swift-Tuttle, delivering brisk 59 km/s meteors radiating from the constellation Perseus.',
    sourceReference: 'International Meteor Organization (IMO)',
    sourceUrl: 'https://www.imo.net/resources/calendar/',
  },
];
