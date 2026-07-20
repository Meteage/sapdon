export const TintMethod = {
  GRASS: 'grass',
  WATER: 'water',
  DEFAULT_FOLIAGE: 'default_foliage',
  EVERGREEN_FOLIAGE: 'evergreen_foliage',
  DRY_FOLIAGE: 'dry_foliage',
  BIRCH_FOLIAGE: 'birch_foliage',
} as const

export type TintMethod = (typeof TintMethod)[keyof typeof TintMethod]
