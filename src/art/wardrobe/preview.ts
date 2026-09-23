import { POT_COLORS } from '../palette';
import { pepinSvg } from '../pepin';
import { DEFAULT_OUTFIT, type Outfit } from '../types';
import type { Preview } from '../preview';

import { WARDROBE } from '.';

/** A few complete outfits, to see the pieces together. */
const OUTFITS: Record<string, Partial<Outfit>> = {
  cozy: { pot: 'cream', pattern: 'sweater', head: 'hat-beanie', neck: 'neck-scarf', held: 'held-tea' },
  night: { pot: 'midnight', pattern: 'stars', head: 'hat-nightcap', eyes: 'mask-sleep', held: 'held-candle' },
  garden: { pot: 'terracotta', head: 'hat-straw', neck: 'neck-lei', held: 'held-watering-can' },
  chic: { pot: 'charcoal', pattern: 'breton', head: 'hat-beret', eyes: 'glasses-round', neck: 'neck-bow-tie', held: 'held-book' },
};

/** Pépin as it comes, in every pot color, then wearing each item alone, then a few outfits. */
export function wardrobePreviews(): Preview[] {
  return [
    { group: 'pepin', name: 'default', svg: pepinSvg(DEFAULT_OUTFIT) },
    ...Object.keys(POT_COLORS).map((pot) => ({
      group: 'pepin',
      name: `pot-${pot}`,
      svg: pepinSvg({ ...DEFAULT_OUTFIT, pot }),
    })),
    ...WARDROBE.map((item) => ({
      group: 'pepin',
      name: `${item.slot}-${item.id}`,
      svg: pepinSvg({ ...DEFAULT_OUTFIT, [item.slot]: item.id }),
    })),
    ...Object.entries(OUTFITS).map(([name, outfit]) => ({
      group: 'pepin',
      name: `outfit-${name}`,
      svg: pepinSvg(outfit, { mood: name === 'night' ? 'sleepy' : 'happy' }),
    })),
  ];
}
