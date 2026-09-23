import { BLUSH } from '../palette';
import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { SAGE, fill, halfLeafPath, leafPath, lineGradient, oval, polar, type Point } from './shapes-bloom';

/** Where the rosette sits, just behind the rim. */
const CENTER: Point = [512, 556];

type Leaf = { angle: number; length: number; width: number; ring: 0 | 1 | 2 };

/** From the outer leaves, wide open, to the upright heart drawn last. */
const LEAVES: Leaf[] = [
  { angle: -80, length: 228, width: 128, ring: 0 },
  { angle: 80, length: 228, width: 128, ring: 0 },
  { angle: -52, length: 240, width: 136, ring: 0 },
  { angle: 52, length: 240, width: 136, ring: 0 },
  { angle: -24, length: 236, width: 128, ring: 1 },
  { angle: 24, length: 236, width: 128, ring: 1 },
  { angle: -64, length: 176, width: 112, ring: 1 },
  { angle: 64, length: 176, width: 112, ring: 1 },
  { angle: -36, length: 168, width: 104, ring: 2 },
  { angle: 36, length: 168, width: 104, ring: 2 },
  { angle: 0, length: 200, width: 110, ring: 2 },
];

/** Darker outside, paler and powdery in the heart. */
const RING_COLORS: [base: string, lit: string][] = [
  [SAGE.deep, SAGE.mid],
  [SAGE.dark, SAGE.light],
  [SAGE.mid, SAGE.light],
];

/** An echeveria rosette: plump pointed leaves, blue-green with blushing tips. */
export const succulent: Foliage = {
  label: 'Succulente',
  back: () => {
    let defs = '';
    // The heart of the rosette, so nothing shows between the leaves' feet.
    let body = oval([512, 540], 150, 44, SAGE.deep);
    LEAVES.forEach(({ angle, length, width, ring }, i) => {
      const base = polar(CENTER, angle, 18);
      const tip = polar(CENTER, angle, length);
      const id = `succulent-leaf-${i}`;
      const [dark, lit] = RING_COLORS[ring];
      defs += lineGradient(id, base, tip, [
        [0, dark],
        [0.5, lit],
        [0.78, lit],
        [1, BLUSH],
      ]);
      const shape = { round: 0.8, full: 0.5 };
      body +=
        fill(leafPath(base, tip, width, shape), artUrl(id)) +
        fill(halfLeafPath(base, tip, width, shape, angle < 0 ? -1 : 1), SAGE.deep, 0.22);
    });
    return { defs, body };
  },
};
