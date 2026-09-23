import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import {
  colorKey,
  dot,
  fill,
  fruit,
  leafPath,
  line,
  ribbonPath,
  shades,
  type Curve,
  type Point,
} from './shapes-bloom';

const LEMON = '#FFD54A';

/** Bark, lit on the left. */
const WOOD = { light: '#B07E55', dark: '#7E5236' };

const TRUNK: Curve = [
  [512, 604],
  [508, 544],
  [520, 490],
  [512, 414],
];

/** Round clumps of leaves making the crown: center and radius, back ones first. */
const BACK_CLUMPS: [Point, number][] = [
  [[416, 358], 76],
  [[608, 354], 76],
  [[512, 264], 82],
];
const FRONT_CLUMPS: [Point, number][] = [
  [[450, 294], 82],
  [[576, 290], 82],
  [[446, 408], 76],
  [[580, 404], 76],
  [[512, 354], 98],
];

/** Leaves sticking out of the crown: base, tip. */
const LEAVES: [Point, Point][] = [
  [[360, 332], [318, 304]],
  [[664, 326], [708, 300]],
  [[470, 210], [446, 174]],
  [[560, 212], [592, 180]],
  [[372, 434], [334, 456]],
  [[654, 430], [694, 450]],
];

/** Fruits hanging in the leaves. */
const FRUITS: [Point, number][] = [
  [[448, 314], 22],
  [[586, 276], 22],
  [[522, 400], 23],
  [[430, 418], 20],
  [[616, 404], 21],
  [[516, 246], 20],
];

/** A little standard tree: a slim trunk, a round leafy crown and bright round fruits. */
export const tree: Foliage = {
  label: 'Petit arbre',
  back: ({ accent = LEMON }) => {
    const s = shades(accent);
    const key = colorKey(accent);
    // A slim trunk, thinner at the top, and a little branch.
    let body =
      fill(ribbonPath(TRUNK, (t) => 30 - t * 10), artUrl('tree-trunk')) +
      line('M 514 482 Q 548 454 566 420', WOOD.dark, 12);
    for (const [base, tip] of LEAVES) {
      body += fill(leafPath(base, tip, 36, { round: 0.4 }), artUrl('tree-back'));
    }
    for (const [c, r] of BACK_CLUMPS) body += dot(c, r, artUrl('tree-back'));
    for (const [c, r] of FRONT_CLUMPS) body += dot(c, r, artUrl('tree-front'));
    for (const [c, r] of FRUITS) body += fruit(c, r, artUrl(`tree-fruit-${key}`));
    return {
      defs:
        linearGradient('tree-trunk', [0, 0, 1, 0], [
          [0, WOOD.light],
          [1, WOOD.dark],
        ]) +
        linearGradient('tree-back', [0, 0, 1, 1], [
          [0, LEAF.mid],
          [1, LEAF.deep],
        ]) +
        linearGradient('tree-front', [0, 0, 1, 1], [
          [0, LEAF.light],
          [1, LEAF.dark],
        ]) +
        linearGradient(`tree-fruit-${key}`, [0, 0, 1, 1], [
          [0, s.light],
          [1, s.shade],
        ]),
      body,
    };
  },
};
