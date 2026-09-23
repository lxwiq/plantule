import { LEAF } from '../palette';
import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { bezierAngle, bezierAt, curve, ellipse, fillPath, frame, leaf, leafGradients, stem } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** Where the pairs of leaflets grow along a stem. */
const PAIRS = [0.36, 0.5, 0.64, 0.78];

/** A ZZ stem (Bézier control points) with pairs of glossy leaflets and one at the tip. */
function zzStem(spine: Pt[], size: number, paint: string): string {
  const leaflets: [Pt, number, number][] = [
    ...PAIRS.flatMap((t): [Pt, number, number][] => {
      const angle = bezierAngle(spine, t);
      const length = size * (1.08 - t * 0.4);
      return [
        [bezierAt(spine, t), angle - 40, length],
        [bezierAt(spine, t), angle + 40, length],
      ];
    }),
    [bezierAt(spine, 0.94), bezierAngle(spine, 1), size * 0.74],
  ];
  const shapes = leaflets.map(([base, angle, length]) => leaf(base, angle, length, length * 0.56, { round: 0.8 })).join(' ');
  const gloss = leaflets
    .map(([base, angle, length]) =>
      fillPath(ellipse(frame(base, angle)(length * 0.52, -length * 0.1), length * 0.2, length * 0.055, angle - 90), '#FFFFFF', 0.32),
    )
    .join('');
  return stem(curve(spine), 14) + fillPath(shapes, paint) + gloss;
}

/** Zamioculcas: upright stems lined with rows of glossy oval leaflets. */
export const zz: Foliage = {
  label: 'Zamioculcas',
  back: () => {
    const [l, r] = [artUrl('zz-leaf-l'), artUrl('zz-leaf-r')];
    return {
      defs: leafGradients('zz-leaf', [LEAF.light, LEAF.deep], [LEAF.mid, LEAF.deep]),
      body:
        zzStem([[494, 606], [440, 450], [296, 330]], 86, l) +
        zzStem([[530, 606], [586, 450], [730, 336]], 86, r) +
        zzStem([[512, 606], [516, 420], [506, 204]], 92, l),
    };
  },
};
