import { POT_COLORS } from '../palette';
import { pepinSvg } from '../pepin';
import { DEFAULT_OUTFIT } from '../types';
import type { Preview } from '../preview';

import { WARDROBE } from '.';

/** Pépin as it comes, in every pot color, then wearing each item alone. */
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
  ];
}
