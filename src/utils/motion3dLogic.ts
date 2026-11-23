export type RenderQualityTier = 'full' | 'balanced' | 'static-fallback';

export interface CapabilityInput {
  hasWebGL: boolean;
  isSoftwareGl: boolean;
  prefersReducedMotion: boolean;
  viewportWidth: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface RenderProfile {
  tier: RenderQualityTier;
  useWebGL: boolean;
  animate: boolean;
  pixelRatioCap: number;
  starCount: number;
  enableParallax: boolean;
  enableCardTilt: boolean;
  isMobile: boolean;
  shadowsEnabled: boolean;
  asteroidCount: number;
  geometryDetail: 'high' | 'medium' | 'low';
}

export interface TiltResult {
  rotateX: number;
  rotateY: number;
  glareX: number;
  glareY: number;
}

export interface SolarBodySpec {
  id: 'sun' | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn';
  name: string;
  classification: string;
  orbitRadius: number;
  visualRadius: number;
  orbitalSpeed: number;
  initialAngle: number;
  inclinationDeg: number;
  axialTiltDeg: number;
  colorHex: string;
  accentHex: string;
  distanceAu: string;
  orbitalPeriod: string;
  summary: string;
  hasRings?: boolean;
  hasMoon?: boolean;
}

export const SOLAR_SYSTEM_BODIES: readonly SolarBodySpec[] = [
  {
    id: 'sun',
    name: 'Sun',
    classification: 'G2V Main-Sequence Star',
    orbitRadius: 0,
    visualRadius: 1.05,
    orbitalSpeed: 0,
    initialAngle: 0,
    inclinationDeg: 0,
    axialTiltDeg: 7.25,
    colorHex: '#F59E0B',
    accentHex: '#FDE68A',
    distanceAu: '0.00 AU',
    orbitalPeriod: '230 Myr (Galactic)',
    summary:
      'Contains 99.86% of Solar System mass, driving space weather, heliospheric plasma, and planetary climates.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    classification: 'Terrestrial Planet',
    orbitRadius: 2.05,
    visualRadius: 0.16,
    orbitalSpeed: 0.85,
    initialAngle: 0.6,
    inclinationDeg: 3.4,
    axialTiltDeg: 0.03,
    colorHex: '#94A3B8',
    accentHex: '#CBD5E1',
    distanceAu: '0.39 AU',
    orbitalPeriod: '88.0 days',
    summary:
      'Innermost iron-core world currently surveyed by ESA/JAXA BepiColombo ahead of orbital insertion.',
  },
  {
    id: 'venus',
    name: 'Venus',
    classification: 'Terrestrial Planet',
    orbitRadius: 2.85,
    visualRadius: 0.24,
    orbitalSpeed: 0.56,
    initialAngle: 2.35,
    inclinationDeg: 1.8,
    axialTiltDeg: 177.4,
    colorHex: '#D97706',
    accentHex: '#FCD34D',
    distanceAu: '0.72 AU',
    orbitalPeriod: '224.7 days',
    summary:
      'Super-rotating carbon dioxide atmosphere and runaway greenhouse climate studied as an exoplanet analog.',
  },
  {
    id: 'earth',
    name: 'Earth',
    classification: 'Temperate Ocean World',
    orbitRadius: 3.8,
    visualRadius: 0.28,
    orbitalSpeed: 0.4,
    initialAngle: 4.1,
    inclinationDeg: 0,
    axialTiltDeg: 23.44,
    colorHex: '#3B82F6',
    accentHex: '#93C5FD',
    distanceAu: '1.00 AU',
    orbitalPeriod: '365.25 days',
    summary:
      'Active magnetosphere, liquid hydrosphere, and reference baseline for habitable-zone transmission spectroscopy.',
    hasMoon: true,
  },
  {
    id: 'mars',
    name: 'Mars',
    classification: 'Terrestrial Planet',
    orbitRadius: 4.85,
    visualRadius: 0.21,
    orbitalSpeed: 0.28,
    initialAngle: 5.5,
    inclinationDeg: 1.85,
    axialTiltDeg: 25.19,
    colorHex: '#DC6B4A',
    accentHex: '#FCA5A5',
    distanceAu: '1.52 AU',
    orbitalPeriod: '687.0 days',
    summary:
      'Ancient fluvial deltas in Jezero Crater preserve sedimentary strata targeted for astrobiology sample analysis.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    classification: 'Gas Giant',
    orbitRadius: 6.35,
    visualRadius: 0.56,
    orbitalSpeed: 0.16,
    initialAngle: 1.45,
    inclinationDeg: 1.3,
    axialTiltDeg: 3.13,
    colorHex: '#C28E62',
    accentHex: '#E2C2A2',
    distanceAu: '5.20 AU',
    orbitalPeriod: '11.86 years',
    summary:
      'Dominant gravitational shepherd hosting subsurface ocean moons Europa and Ganymede explored by Europa Clipper and JUICE.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    classification: 'Ringed Gas Giant',
    orbitRadius: 8.2,
    visualRadius: 0.46,
    orbitalSpeed: 0.11,
    initialAngle: 3.55,
    inclinationDeg: 2.48,
    axialTiltDeg: 26.73,
    colorHex: '#D4B483',
    accentHex: '#E5D3B3',
    distanceAu: '9.58 AU',
    orbitalPeriod: '29.45 years',
    summary:
      'Extensive water-ice ring system and hydrocarbon-rich moon Titan, destination of NASA’s Dragonfly rotorcraft.',
    hasRings: true,
  },
];

/**
 * Clamps normalized reading scroll progress strictly to [0, 1].
 */
export function computeScrollProgress(
  scrollY: number,
  docHeight: number,
  viewportHeight: number
): number {
  const maxScroll = Math.max(0, docHeight - viewportHeight);
  if (maxScroll <= 0) return 0;
  return Math.min(1, Math.max(0, scrollY / maxScroll));
}

/**
 * Computes restrained 3D perspective tilt angles from normalized cursor offset (-0.5..0.5).
 */
export function computeTiltTransform(
  normX: number,
  normY: number,
  maxDeg = 4.5
): TiltResult {
  const clampedX = Math.max(-0.5, Math.min(0.5, normX));
  const clampedY = Math.max(-0.5, Math.min(0.5, normY));
  const rotateY = Number((clampedX * 2 * maxDeg).toFixed(3));
  const rotateX = Number((-clampedY * 2 * maxDeg).toFixed(3));
  const glareX = Number(((clampedX + 0.5) * 100).toFixed(1));
  const glareY = Number(((clampedY + 0.5) * 100).toFixed(1));
  return { rotateX, rotateY, glareX, glareY };
}

/**
 * Determines the optimal rendering tier from device capability, viewport size,
 * WebGL availability, and prefers-reduced-motion.
 */
export function selectRenderQuality(input: CapabilityInput): RenderProfile {
  const isMobileViewport = input.viewportWidth < 768;
  const isLowMemory =
    typeof input.deviceMemory === 'number' && input.deviceMemory > 0 && input.deviceMemory <= 2;
  const isLowCore =
    typeof input.hardwareConcurrency === 'number' &&
    input.hardwareConcurrency > 0 &&
    input.hardwareConcurrency <= 2;

  if (!input.hasWebGL || (isLowMemory && isLowCore)) {
    return {
      tier: 'static-fallback',
      useWebGL: false,
      animate: !input.prefersReducedMotion,
      pixelRatioCap: 1,
      starCount: isMobileViewport ? 48 : 90,
      enableParallax: false,
      enableCardTilt: false,
      isMobile: isMobileViewport,
      shadowsEnabled: false,
      asteroidCount: 0,
      geometryDetail: 'low',
    };
  }

  if (input.prefersReducedMotion) {
    return {
      tier: 'balanced',
      useWebGL: true,
      animate: false,
      pixelRatioCap: input.isSoftwareGl ? 1 : isMobileViewport ? 1.25 : 1.5,
      starCount: isMobileViewport ? 120 : 160,
      enableParallax: false,
      enableCardTilt: false,
      isMobile: isMobileViewport,
      shadowsEnabled: false,
      asteroidCount: isMobileViewport ? 64 : 110,
      geometryDetail: isMobileViewport ? 'low' : 'medium',
    };
  }

  if (isMobileViewport) {
    return {
      tier: 'balanced',
      useWebGL: true,
      animate: true,
      pixelRatioCap: input.isSoftwareGl || isLowMemory || isLowCore ? 1 : 1.35,
      starCount: input.isSoftwareGl ? 110 : 160,
      enableParallax: true,
      enableCardTilt: false,
      isMobile: true,
      shadowsEnabled: false,
      asteroidCount: input.isSoftwareGl ? 56 : 78,
      geometryDetail: 'low',
    };
  }

  if (input.isSoftwareGl || isLowMemory || isLowCore || input.viewportWidth < 1024) {
    return {
      tier: 'balanced',
      useWebGL: true,
      animate: true,
      pixelRatioCap: input.isSoftwareGl ? 1 : 1.5,
      starCount: 240,
      enableParallax: true,
      enableCardTilt: input.viewportWidth >= 1024,
      isMobile: false,
      shadowsEnabled: false,
      asteroidCount: input.isSoftwareGl ? 100 : 130,
      geometryDetail: 'medium',
    };
  }

  return {
    tier: 'full',
    useWebGL: true,
    animate: true,
    pixelRatioCap: 2,
    starCount: 420,
    enableParallax: true,
    enableCardTilt: true,
    isMobile: false,
    shadowsEnabled: true,
    asteroidCount: 160,
    geometryDetail: 'high',
  };
}

/**
 * Computes 3D heliocentric coordinates for a body on an inclined circular/elliptical orbit.
 */
export function computeOrbitalPosition(
  orbitRadius: number,
  angleRad: number,
  inclinationDeg: number,
  eccentricity = 0.04
): { x: number; y: number; z: number } {
  if (orbitRadius <= 0) {
    return { x: 0, y: 0, z: 0 };
  }
  const incRad = (inclinationDeg * Math.PI) / 180;
  const r = orbitRadius * (1 - eccentricity * Math.cos(angleRad));
  const x = Math.cos(angleRad) * r;
  const zFlat = Math.sin(angleRad) * r;
  const y = Math.sin(angleRad) * r * Math.sin(incRad);
  const z = zFlat * Math.cos(incRad);
  return { x, y, z };
}
