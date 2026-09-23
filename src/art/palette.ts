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
  /** The face's eyes and mouth on this pot, when INK doesn't read on it. */
  ink?: string;
  /** The cheeks on this pot, when BLUSH doesn't show on it. */
  blush?: string;
};

/**
 * Pot colors, for the plants (always terracotta) and for Pépin's wardrobe, in
 * the order the wardrobe shows them: the logo's terracotta, then soft tones.
 */
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
  cream: {
    label: 'Crème',
    palette: {
      shadow: '#D8BF98',
      body: '#EEDDC0',
      light: '#F4E7D1',
      rim: '#F7EBD6',
      rimHighlight: '#FFF8EB',
    },
  },
  powder_pink: {
    label: 'Rose poudré',
    palette: {
      shadow: '#D98E92',
      body: '#EDAAAD',
      light: '#F2B9BA',
      rim: '#F5C2C2',
      rimHighlight: '#FBDADA',
      blush: '#E57A83',
    },
  },
  mustard: {
    label: 'Moutarde',
    palette: {
      shadow: '#C18A2A',
      body: '#DDA842',
      light: '#E4B654',
      rim: '#EBC062',
      rimHighlight: '#F4D68A',
    },
  },
  sage: {
    label: 'Sauge',
    palette: {
      shadow: '#7D9A78',
      body: '#9AB595',
      light: '#A8C1A3',
      rim: '#B0C9AA',
      rimHighlight: '#C9DDC3',
    },
  },
  mint: {
    label: 'Menthe',
    palette: {
      shadow: '#6FBBA0',
      body: '#93D5BD',
      light: '#A2DDC8',
      rim: '#ACE3CF',
      rimHighlight: '#C9EFE1',
    },
  },
  sky: {
    label: 'Bleu ciel',
    palette: {
      shadow: '#78A7CA',
      body: '#9AC4E3',
      light: '#A8CEEA',
      rim: '#B2D6EE',
      rimHighlight: '#CFE6F6',
    },
  },
  lavender: {
    label: 'Lavande',
    palette: {
      shadow: '#9480C0',
      body: '#B3A2D8',
      light: '#BEAFDF',
      rim: '#C6B8E4',
      rimHighlight: '#DCD2F0',
    },
  },
  midnight: {
    label: 'Bleu nuit',
    palette: {
      shadow: '#2C3C62',
      body: '#3D5282',
      light: '#465D8E',
      rim: '#4F6696',
      rimHighlight: '#6980AE',
      ink: '#FFF1DD',
    },
  },
  charcoal: {
    label: 'Anthracite',
    palette: {
      shadow: '#44474D',
      body: '#5A5E66',
      light: '#636770',
      rim: '#6C7079',
      rimHighlight: '#878B94',
      ink: '#FFF1DD',
    },
  },
};

export function potPalette(id: string): PotPalette {
  return (POT_COLORS[id] ?? POT_COLORS.terracotta).palette;
}
