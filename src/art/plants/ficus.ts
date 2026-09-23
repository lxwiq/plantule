import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { ellipse, fillPath, frame, leaf, leafGradients, ribbon, smooth, stem, vein } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** Bark, lit from the left. */
const BARK: [string, string] = ['#A97852', '#7A5033'];

/** A big glossy oval leaf with a pale midrib. */
function ficusLeaf([base, angle, length]: [Pt, number, number], paint: string): string {
  const f = frame(base, angle);
  return (
    fillPath(leaf(base, angle, length, length * 0.6, { profile: [0.6, 0.96, 0.94, 0.56] }), paint) +
    vein(smooth([f(length * 0.08, 0), f(length * 0.5, 0), f(length * 0.84, 0)]), 8) +
    fillPath(ellipse(f(length * 0.52, -length * 0.14), length * 0.15, length * 0.042, angle - 90), '#FFFFFF', 0.28)
  );
}

/** Leaves of the crown, back to front: where each one starts, its angle and length. */
const CROWN: [Pt, number, number][] = [
  [[446, 396], -116, 112],
  [[574, 364], 114, 112],
  [[422, 364], -64, 128],
  [[600, 336], 62, 128],
  [[504, 336], -4, 132],
  [[398, 334], -24, 118],
  [[616, 314], 26, 118],
  [[503, 372], -36, 118],
  [[503, 356], 34, 116],
  [[505, 462], -96, 104],
  [[505, 446], 94, 100],
];

/** Ficus and other small indoor trees: a short trunk, a crown of big glossy leaves. */
export const ficus: Foliage = {
  label: 'Ficus',
  back: () => {
    const [l, r] = [artUrl('ficus-leaf-l'), artUrl('ficus-leaf-r')];
    return {
      defs:
        leafGradients('ficus-leaf') +
        linearGradient('ficus-bark', [0, 0, 1, 0], [
          [0, BARK[0]],
          [1, BARK[1]],
        ]),
      body:
        stem(smooth([[504, 440], [446, 400], [398, 334]]), 11, BARK[1]) +
        stem(smooth([[503, 410], [560, 372], [616, 314]]), 11, BARK[1]) +
        fillPath(ribbon([[508, 620], [498, 470], [503, 330]], (s) => 16 - s * 8), artUrl('ficus-bark')) +
        CROWN.map((l3) => ficusLeaf(l3, l3[1] < 0 ? l : r)).join(''),
    };
  },
};
