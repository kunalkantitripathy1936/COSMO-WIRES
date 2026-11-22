import { NewsCategory } from '../types';

export const GENERATED_IMAGES = {
  nebula: '/src/assets/images/cosmic_hero_nebula_1795288668241.jpg',
  blackhole: '/src/assets/images/black_hole_accretion_1795288668857.jpg',
  exoplanet: '/src/assets/images/exoplanet_horizon_1795288667460.jpg',
  observatory: '/src/assets/images/deep_space_observatory_1795288668062.jpg',
  galaxy: '/src/assets/images/spiral_galaxy_field_1795288667702.jpg',
} as const;

export function getFallbackImageForCategory(category: NewsCategory): string {
  switch (category) {
    case 'Black Holes':
    case 'Astrophysics':
      return GENERATED_IMAGES.blackhole;
    case 'Exoplanets':
    case 'Solar System':
      return GENERATED_IMAGES.exoplanet;
    case 'Galaxies':
    case 'Cosmology':
    case 'Astronomy':
      return GENERATED_IMAGES.galaxy;
    case 'Rocket Science':
    case 'Space Exploration':
    case 'Space Technology':
      return GENERATED_IMAGES.observatory;
    default:
      return GENERATED_IMAGES.galaxy;
  }
}
