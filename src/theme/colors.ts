/**
 * Plantule palette: a Material 3 tonal scheme built from a leaf-green seed,
 * with light and dark variants. Components read it through `useTheme()`.
 *
 * The brand keeps its own greens instead of Android dynamic colors, so the app
 * looks the same on every phone of the house.
 */

const light = {
  primary: '#2E6B3E',
  onPrimary: '#FFFFFF',
  primaryContainer: '#B4F1BD',
  onPrimaryContainer: '#00210C',

  secondaryContainer: '#D3E8D2',
  onSecondaryContainer: '#0F1F12',

  background: '#F6FBF3',
  surface: '#F6FBF3',
  surfaceContainerLow: '#F0F5ED',
  surfaceContainer: '#EAEFE7',
  surfaceContainerHigh: '#E4EAE1',
  surfaceContainerHighest: '#DFE4DC',

  text: '#171D18',
  textSecondary: '#414941',
  textTertiary: '#717970',
  outline: '#717970',
  outlineVariant: '#C0C9BE',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  warning: '#8A5100',
  warningContainer: '#FFDCBE',
  onWarningContainer: '#2C1600',

  scrim: 'rgba(0, 0, 0, 0.32)',
};

export type Palette = { [K in keyof typeof light]: string };

const dark: Palette = {
  primary: '#99D5A2',
  onPrimary: '#00391A',
  primaryContainer: '#145228',
  onPrimaryContainer: '#B4F1BD',

  secondaryContainer: '#394B3A',
  onSecondaryContainer: '#D3E8D2',

  background: '#0F1510',
  surface: '#0F1510',
  surfaceContainerLow: '#171D18',
  surfaceContainer: '#1B211C',
  surfaceContainerHigh: '#262B26',
  surfaceContainerHighest: '#303630',

  text: '#DEE4DA',
  textSecondary: '#C0C9BE',
  textTertiary: '#8A9389',
  outline: '#8A9389',
  outlineVariant: '#414941',

  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  warning: '#FFB86E',
  warningContainer: '#693C00',
  onWarningContainer: '#FFDCBE',

  scrim: 'rgba(0, 0, 0, 0.5)',
};

export const palettes = { light, dark } as const;

/** Accent per care task kind, as a container and its content color. */
export type Accent = { container: string; content: string };

const accents = {
  light: {
    water: { container: '#D1E4FF', content: '#003A6B' },
    fertilize: { container: '#F5E1A4', content: '#3F2E00' },
    mist: { container: '#BDEBF0', content: '#00363B' },
    repot: { container: '#FFDBCF', content: '#5C1A00' },
    prune: { container: '#CDEDA3', content: '#1E3700' },
    clean: { container: '#DDE5DB', content: '#2A332B' },
    rotate: { container: '#E9DDFF', content: '#2A1260' },
    other: { container: '#E4EAE1', content: '#2A332B' },
  },
  dark: {
    water: { container: '#00497F', content: '#D1E4FF' },
    fertilize: { container: '#5A4400', content: '#F5E1A4' },
    mist: { container: '#004F55', content: '#BDEBF0' },
    repot: { container: '#7B2E12', content: '#FFDBCF' },
    prune: { container: '#2F4F0B', content: '#CDEDA3' },
    clean: { container: '#3A443B', content: '#DDE5DB' },
    rotate: { container: '#41297A', content: '#E9DDFF' },
    other: { container: '#303630', content: '#DDE5DB' },
  },
} as const satisfies Record<'light' | 'dark', Record<string, Accent>>;

export type AccentName = keyof typeof accents.light;

export function accentFor(scheme: 'light' | 'dark', name: AccentName): Accent {
  return accents[scheme][name];
}
