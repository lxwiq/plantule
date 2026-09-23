import type { TextStyle } from 'react-native';

/**
 * Fraunces, a soft serif, gives titles and plant names their character.
 * Everything else uses the system font (Roboto on Android).
 */
export const fonts = {
  display: 'Fraunces_600SemiBold',
} as const;

/** Text styles, without color: `Text` applies the theme color. */
export const typography = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },
  subhead: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
