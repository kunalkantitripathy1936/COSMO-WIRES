import type { Article, NewsCategory, SpaceMission } from '../types.js';

export interface CategoryMeta {
  name: NewsCategory;
  subtitle: string;
  description: string;
  imageKey: 'nebula' | 'blackhole' | 'exoplanet' | 'observatory' | 'galaxy';
}

export const CATEGORY_METADATA: CategoryMeta[] = [
  {
    name: 'Astronomy',
    subtitle: 'Observational Sky Surveys',
    description: 'Deep-sky imaging, optical and radio observatories, transient skies, and precision astrometry.',
    imageKey: 'nebula',
  },
  {
    name: 'Astrophysics',
    subtitle: 'High-Energy Phenomena',
    description: 'Neutron stars, supernovae, gravitational waves, relativistic plasma, and stellar nucleosynthesis.',
    imageKey: 'blackhole',
  },
  {
    name: 'Cosmology',
    subtitle: 'Origin & Large-Scale Structure',
    description: 'Dark matter filaments, dark energy equations of state, cosmic inflation, and the Hubble tension.',
    imageKey: 'galaxy',
  },
  {
    name: 'Black Holes',
    subtitle: 'Relativistic Horizons',
    description: 'Very-long-baseline interferometry, active galactic nuclei, accretion dynamics, and mergers.',
    imageKey: 'blackhole',
  },
  {
    name: 'Exoplanets',
    subtitle: 'Worlds Beyond the Sun',
    description: 'Transmission spectroscopy, temperate rocky worlds, planetary migration, and atmospheric chemistry.',
    imageKey: 'exoplanet',
  },
  {
    name: 'Galaxies',
    subtitle: 'Cosmic Islands & Evolution',
    description: 'Early-universe protogalaxies, spiral dynamics, galactic mergers, and interstellar star nurseries.',
    imageKey: 'galaxy',
  },
  {
    name: 'Solar System',
    subtitle: 'Planetary & Heliophysics',
    description: 'Mars geology, ocean moons, solar cycles, small-body sample returns, and outer giant atmospheres.',
    imageKey: 'exoplanet',
  },
  {
    name: 'Rocket Science',
    subtitle: 'Propulsion & Launch Systems',
    description: 'Reusable orbital boosters, cryogenic propulsion, deep-space trajectories, and orbital mechanics.',
    imageKey: 'observatory',
  },
  {
    name: 'Space Exploration',
    subtitle: 'Crewed & Robotic Frontiers',
    description: 'Artemis lunar architecture, planetary landers, interplanetary probes, and international stations.',
    imageKey: 'observatory',
  },
  {
    name: 'Space Technology',
    subtitle: 'Instrumentation & Optics',
    description: 'Segmented infrared mirrors, optical laser telemetry, autonomous navigation, and radiation shielding.',
    imageKey: 'observatory',
  },
];

export const ACTIVE_SPACE_MISSIONS: SpaceMission[] = [
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    agency: 'NASA / ESA / CSA',
    status: 'Active Operations',
    launchDate: 'December 25, 2021',
    destination: 'Sun–Earth L2 Halo Orbit (1.5M km)',
    instrumentHighlight: '6.5m Gold-Coated Beryllium Mirror · NIRCam, NIRSpec, MIRI',
    summary:
      'Operating at cryogenic temperatures near 40 K, JWST resolves galaxies formed within 300 million years of the Big Bang and characterizes molecular spectra of exoplanet atmospheres.',
    officialUrl: 'https://science.nasa.gov/mission/webb/',
    imageCategory: 'observatory',
  },
  {
    id: 'europa-clipper',
    name: 'Europa Clipper',
    agency: 'NASA JPL',
    status: 'In Transit',
    launchDate: 'October 14, 2024',
    destination: 'Jovian System (Arrival April 2030)',
    instrumentHighlight: 'Ice-Penetrating Radar (REASON) · Mass Spectrometer (MASPEX)',
    summary:
      'En route to Jupiter to conduct nearly 50 close flybys of Europa, assessing the thickness of its icy shell and the habitability of the global subsurface saltwater ocean beneath.',
    officialUrl: 'https://europa.nasa.gov/',
    imageCategory: 'exoplanet',
  },
  {
    id: 'euclid',
    name: 'Euclid Dark Universe Mission',
    agency: 'ESA',
    status: 'Active Operations',
    launchDate: 'July 1, 2023',
    destination: 'Sun–Earth L2',
    instrumentHighlight: '1.2m Korsch Telescope · VIS & NISP Wide-Field Imagers',
    summary:
      'Constructing the largest and most accurate three-dimensional map of cosmic structure across a third of the sky to measure dark matter distribution and dark energy expansion history.',
    officialUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Euclid',
    imageCategory: 'galaxy',
  },
  {
    id: 'aditya-l1',
    name: 'Aditya-L1 Solar Observatory',
    agency: 'ISRO',
    status: 'Active Operations',
    launchDate: 'September 2, 2023',
    destination: 'Sun–Earth L1 Halo Orbit',
    instrumentHighlight: 'Visible Emission Line Coronagraph (VELC) · SUIT UV Imager',
    summary:
      'India’s first dedicated solar space observatory continuously monitors the solar corona, chromospheric flares, and coronal mass ejections to advance space weather forecasting.',
    officialUrl: 'https://www.isro.gov.in/Aditya_L1.html',
    imageCategory: 'observatory',
  },
  {
    id: 'voyager',
    name: 'Voyager 1 & Voyager 2',
    agency: 'NASA JPL',
    status: 'Active Operations',
    launchDate: '1977',
    destination: 'Interstellar Medium (> 20 billion km)',
    instrumentHighlight: 'Cosmic Ray Subsystem · Plasma Wave & Magnetometer Suite',
    summary:
      'Humanity’s farthest spacecraft continue sampling interstellar plasma density and cosmic rays beyond the heliopause nearly five decades after departing Earth.',
    officialUrl: 'https://science.nasa.gov/mission/voyager/',
    imageCategory: 'blackhole',
  },
  {
    id: 'roman',
    name: 'Nancy Grace Roman Space Telescope',
    agency: 'NASA GSFC',
    status: 'Upcoming Launch',
    launchDate: 'Target by May 2027',
    destination: 'Sun–Earth L2',
    instrumentHighlight: 'Wide Field Instrument (100× Hubble FOV) · Coronagraph Demo',
    summary:
      'Designed to survey hundreds of millions of galaxies, detect thousands of microlensing exoplanets, and demonstrate high-contrast starlight suppression for direct exoplanet imaging.',
    officialUrl: 'https://roman.gsfc.nasa.gov/',
    imageCategory: 'observatory',
  },
];

/**
 * Clearly-labeled archival sample entries used ONLY when external live RSS feeds
 * are unreachable in an offline environment. Never presented as live breaking news.
 */
export const EDITORIAL_ARCHIVE_SAMPLES: Article[] = [
  {
    id: 'sample-jwst-early-galaxies',
    title: 'Sample Archive: Deep-Field Infrared Spectroscopy Probes Early Galaxy Assembly',
    excerpt:
      'Archival briefing illustrating how multi-object infrared spectroscopy measures chemical enrichment and star-formation rates in high-redshift galaxies observed beyond z > 10.',
    url: 'https://science.nasa.gov/mission/webb/',
    publisher: 'NASA (Archive Reference)',
    publishedAt: '2026-11-18T14:00:00Z',
    category: 'Galaxies',
    desks: ['NASA', 'Astronomy', 'Cosmology', 'Scientific Discoveries'],
    topics: ['JWST', 'Galaxies', 'Cosmology'],
    sourceFeed: 'editorial-archive-sample',
    isSample: true,
  },
  {
    id: 'sample-eht-polarized-horizon',
    title: 'Sample Archive: Polarized Millimeter Interferometry Maps Magnetic Fields Near Event Horizons',
    excerpt:
      'Archival briefing examining how Earth-sized millimeter radio arrays trace ordered magnetic field geometry channeling relativistic plasma jets around supermassive black holes.',
    url: 'https://eventhorizontelescope.org/',
    publisher: 'ESA / EHT (Archive Reference)',
    publishedAt: '2026-11-16T11:30:00Z',
    category: 'Black Holes',
    desks: ['ESA', 'Astrophysics', 'Black Holes', 'Scientific Discoveries'],
    topics: ['Black Holes', 'Astrophysics'],
    sourceFeed: 'editorial-archive-sample',
    isSample: true,
  },
  {
    id: 'sample-exoplanet-transmission',
    title: 'Sample Archive: Atmospheric Carbon-Bearing Molecules on Sub-Neptune Exoplanets',
    excerpt:
      'Archival briefing detailing transmission spectroscopy techniques used to distinguish hydrogen-rich envelopes from water-world atmospheres during stellar transits.',
    url: 'https://exoplanets.nasa.gov/',
    publisher: 'NASA Exoplanet Archive (Reference)',
    publishedAt: '2026-11-14T09:15:00Z',
    category: 'Exoplanets',
    desks: ['NASA', 'Astronomy', 'Exoplanets', 'Scientific Discoveries'],
    topics: ['Exoplanets', 'JWST'],
    sourceFeed: 'editorial-archive-sample',
    isSample: true,
  },
  {
    id: 'sample-euclid-dark-web',
    title: 'Sample Archive: Wide-Field Weak Lensing Surveys Trace the Cosmic Web',
    excerpt:
      'Archival briefing explaining how subtle shear distortions in billions of background galaxy shapes allow cosmologists to reconstruct invisible dark matter halos.',
    url: 'https://www.esa.int/Science_Exploration/Space_Science/Euclid',
    publisher: 'ESA (Archive Reference)',
    publishedAt: '2026-11-12T16:45:00Z',
    category: 'Cosmology',
    desks: ['ESA', 'Cosmology', 'Space Missions', 'Scientific Discoveries'],
    topics: ['Dark Matter', 'Cosmology'],
    sourceFeed: 'editorial-archive-sample',
    isSample: true,
  },
  {
    id: 'sample-aditya-corona',
    title: 'Sample Archive: Continuous L1 Coronagraphy Tracks Solar Coronal Mass Ejections',
    excerpt:
      'Archival briefing exploring uninterrupted space-based solar observations from the Sun–Earth L1 vantage point to refine geomagnetic storm lead times.',
    url: 'https://www.isro.gov.in/Aditya_L1.html',
    publisher: 'ISRO (Archive Reference)',
    publishedAt: '2026-11-10T08:00:00Z',
    category: 'Solar System',
    desks: ['ISRO', 'Space Missions', 'Astronomy'],
    topics: ['Solar Activity', 'Space Exploration'],
    sourceFeed: 'editorial-archive-sample',
    isSample: true,
  },
  {
    id: 'sample-heavy-lift-reusability',
    title: 'Sample Archive: Cryogenic Methalox Propulsion and Rapid Orbital Cadence',
    excerpt:
      'Archival briefing on full-flow staged combustion engines, thermal protection tiles, and their engineering impact on heavy deep-space observatory payloads.',
    url: 'https://www.nasa.gov/exploration/',
    publisher: 'NASA Exploration (Reference)',
    publishedAt: '2026-11-08T13:20:00Z',
    category: 'Rocket Science',
    desks: ['NASA', 'Space Missions'],
    topics: ['Orbital Launch', 'Space Technology'],
    sourceFeed: 'editorial-archive-sample',
    isSample: true,
  },
];
