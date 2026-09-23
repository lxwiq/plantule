import { LEAF } from '../palette';
import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { curve, fillPath, leafGradients, leaflets, stem } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** A fern frond (Bézier control points): small rounded leaflets, longest in its middle. */
function frond(spine: Pt[], size: number, paint: string, droop = 0.1): string {
  const shapes = leaflets(spine, {
    count: 9,
    from: 0.2,
    to: 0.96,
    length: (t) => size * (0.45 + 0.55 * Math.sin(Math.PI * (0.25 + t * 0.75))),
    width: 0.52,
    spread: 72,
    droop,
    round: 1,
  });
  return stem(curve(spine), 6) + fillPath(shapes, paint);
}

/** Ferns: a bushy mound of arching fronds, some spilling over the rim. */
export const fern: Foliage = {
  label: 'Fougère',
  back: () => {
    const [l, r] = [artUrl('fern-frond-l'), artUrl('fern-frond-r')];
    return {
      defs: leafGradients('fern-frond'),
      body:
        frond([[496, 580], [380, 460], [236, 480]], 52, l) +
        frond([[528, 580], [644, 460], [788, 480]], 52, r) +
        frond([[500, 576], [420, 350], [296, 300]], 54, l) +
        frond([[524, 576], [604, 350], [728, 300]], 54, r) +
        frond([[506, 574], [470, 340], [420, 200]], 52, l) +
        frond([[518, 574], [554, 340], [604, 200]], 52, r),
    };
  },
  front: () => {
    const [l, r] = [artUrl('fern-drape-l'), artUrl('fern-drape-r')];
    return {
      defs: leafGradients('fern-drape', [LEAF.light, LEAF.mid], [LEAF.light, LEAF.dark]),
      body: frond([[428, 568], [316, 546], [302, 712]], 38, l, 0.25) + frond([[596, 568], [708, 546], [722, 712]], 38, r, 0.25),
    };
  },
};
