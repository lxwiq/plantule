import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { curve, fillPath, leafGradients, polar, ribbon, stem } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** The cream stripe down the middle of each leaf, and the pale runners. */
const CREAM = '#F3EFC8';
const RUNNER = '#B9CC7E';

/** Half width of a grassy leaf: a strap tapering to a point. */
const strap = (width: number) => (s: number) => width * Math.sqrt(Math.max(0, 1 - s ** 2.4));

/**
 * An arching grassy leaf from `base`, heading off at `angle` and falling by
 * `droop` at its tip, with a cream stripe.
 */
function grass(base: Pt, angle: number, length: number, droop: number, paint: string, width = 15): string {
  const mid = polar(base, angle * 0.6, length * 0.6);
  const end = polar(base, angle, length);
  const spine: Pt[] = [base, mid, [end[0], end[1] + droop]];
  return fillPath(ribbon(spine, strap(width)), paint) + fillPath(ribbon(spine, strap(width * 0.32)), CREAM, 0.9);
}

/** The fountain of leaves: angle, length and droop of each one. */
const FOUNTAIN: [number, number, number][] = [
  [-84, 250, 150],
  [84, 250, 150],
  [-62, 262, 110],
  [62, 264, 110],
  [-40, 280, 60],
  [40, 276, 60],
  [-20, 300, 20],
  [20, 296, 22],
  [-4, 330, 0],
];

/** A baby plantlet: a little tuft of leaves. */
function plantlet(center: Pt, paint: string): string {
  return [-120, -64, -24, 22, 66, 124]
    .map((angle) => grass(center, angle, 64 - Math.abs(angle) * 0.08, Math.abs(angle) * 0.3, paint, 10))
    .join('');
}

/** Spider plants: a fountain of striped grassy leaves, and a baby plantlet dangling on a runner. */
export const spider: Foliage = {
  label: 'Plante araignée',
  back: () => ({
    defs: leafGradients('spider-leaf'),
    body: FOUNTAIN.map(([angle, length, droop], i) =>
      grass([506 + (i % 3) * 6, 596], angle, length, droop, artUrl(angle < 0 ? 'spider-leaf-l' : 'spider-leaf-r')),
    ).join(''),
  }),
  front: () => {
    const [l, r] = [artUrl('spider-drape-l'), artUrl('spider-drape-r')];
    return {
      defs: leafGradients('spider-drape'),
      body:
        grass([456, 554], -84, 150, 124, l, 15) +
        stem(curve([[560, 556], [700, 460], [780, 560], [774, 694]]), 6, RUNNER) +
        grass([570, 554], 82, 144, 116, r, 15) +
        plantlet([774, 698], r),
    };
  },
};
