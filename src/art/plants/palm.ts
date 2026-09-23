import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { curve, fillPath, leafGradients, leaflets, stem } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** A feathery frond (Bézier control points): long narrow leaflets hanging from its midrib. */
function frond(spine: Pt[], size: number, paint: string): string {
  const shapes = leaflets(spine, {
    count: 8,
    from: 0.36,
    to: 0.97,
    length: (t) => size * (1 - t * 0.5),
    width: 0.28,
    spread: 38,
    droop: 0.45,
  });
  return stem(curve(spine), 7) + fillPath(shapes, paint);
}

/** Palms: arching feathery fronds. */
export const palm: Foliage = {
  label: 'Palmier',
  back: () => {
    const [l, r] = [artUrl('palm-frond-l'), artUrl('palm-frond-r')];
    return {
      defs: leafGradients('palm-frond'),
      body:
        frond([[500, 600], [380, 430], [226, 470]], 100, l) +
        frond([[524, 600], [644, 430], [798, 470]], 100, r) +
        frond([[506, 600], [440, 320], [300, 240]], 104, l) +
        frond([[518, 600], [584, 320], [724, 240]], 104, r) +
        frond([[512, 600], [520, 340], [536, 196]], 96, l),
    };
  },
};
