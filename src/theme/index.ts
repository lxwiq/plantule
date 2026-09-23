import { useColorScheme } from 'react-native';

import { accentFor, palettes, type AccentName, type Palette } from './colors';

export { accentFor, type Accent, type AccentName, type Palette } from './colors';
export { motion, radius, spacing, touchTarget } from './metrics';
export { fonts, typography, type TypographyVariant } from './typography';

export type Scheme = 'light' | 'dark';

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Colors for the current light/dark mode. */
export function useTheme(): Palette {
  return palettes[useScheme()];
}

export function useAccent(name: AccentName) {
  return accentFor(useScheme(), name);
}

export { palettes };
