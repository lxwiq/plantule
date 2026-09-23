/**
 * The colors of the logo (assets/logo.svg), shared by every drawing so the
 * plants, Pépin and the scenes look like they come from the same hand.
 */

/** Eyes, mouths and fine dark lines. */
export const INK = '#2B1D14';

/** Cheeks. */
export const BLUSH = '#F59C82';

/** The pink of a tongue or an open mouth's inside. */
export const TONGUE = '#EF7C79';

/** Leaves: a light and a dark green for the gradients, the stem and the veins. */
export const LEAF = {
  light: '#5FB06D',
  mid: '#4E9E5E',
  dark: '#2E6B3E',
  deep: '#245A33',
  vein: '#A9E3B1',
  stem: '#2E6B3E',
} as const;

export const SOIL = { top: '#9A6A45', bottom: '#7A5033' } as const;

/** The soft green behind the logo, from the center out. */
export const BACKDROP = { center: '#CFF8D5', edge: '#A2E4AD' } as const;

/** The colors of a pot, from the shadow under its rim to the highlight on the rim. */
export type PotPalette = {
  /** Under the rim, at the top of the body. */
  shadow: string;
  body: string;
  /** Bottom of the body, lit. */
  light: string;
  rim: string;
  rimHighlight: string;
};

/** Pot colors, for the plants (always terracotta) and for Pépin's wardrobe. */
export const POT_COLORS: Record<string, { label: string; palette: PotPalette }> = {
  terracotta: {
    label: 'Terre cuite',
    palette: {
      shadow: '#C9623D',
      body: '#E07B53',
      light: '#E88A62',
      rim: '#EE9468',
      rimHighlight: '#F6AC84',
    },
  },
};

export function potPalette(id: string): PotPalette {
  return (POT_COLORS[id] ?? POT_COLORS.terracotta).palette;
}
