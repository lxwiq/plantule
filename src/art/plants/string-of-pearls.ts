import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { cubicPoint, dot, line, pt, type Curve, type Point } from './shapes-bloom';

const PEARL = { light: '#9ADB8E', dark: '#3F8F4E', shade: '#347A43' };

/** A pearl, shaded by `paint`, with a glint. */
function pearl(p: Point, r: number, paint: string): string {
  return dot(p, r, paint) + dot([p[0] - r * 0.35, p[1] - r * 0.35], r * 0.28, '#FFFFFF', 0.55);
}

/**
 * A string of pearls along a curve, from where it leaves the plant to its tip:
 * beads evenly spaced, a little smaller towards the end.
 */
function strand(c: Curve, r: number, paint: string): string {
  const d = `M ${pt(c[0])} C ${pt(c[1])} ${pt(c[2])} ${pt(c[3])}`;
  let body = line(d, LEAF.stem, 4, 0.8);
  let last = cubicPoint(c, 0);
  let travelled = 0;
  let next = r * 0.9;
  for (let i = 1; i <= 200; i++) {
    const p = cubicPoint(c, i / 200);
    travelled += Math.hypot(p[0] - last[0], p[1] - last[1]);
    last = p;
    if (travelled >= next) {
      const size = r * (1 - 0.3 * (i / 200));
      body += pearl(p, size, paint);
      next = travelled + size * 1.85;
    }
  }
  return body;
}

/** Mirrors a curve across the pot's middle. */
function mirrored(c: Curve): Curve {
  const flip = ([x, y]: Point): Point => [1024 - x, y];
  return [flip(c[0]), flip(c[1]), flip(c[2]), flip(c[3])];
}

/** Rows of pearls making a small mound over the soil, back rows first. */
const MOUND: [y: number, from: number, to: number, count: number][] = [
  [392, 490, 534, 2],
  [420, 466, 558, 3],
  [450, 440, 584, 4],
  [482, 418, 606, 5],
  [514, 398, 626, 6],
  [548, 380, 644, 7],
];

/** Strands hanging behind the pot, on its left (mirrored on the right). */
const BACK_STRANDS: Curve[] = [
  [
    [440, 536],
    [340, 516],
    [262, 560],
    [256, 704],
  ],
  [
    [470, 510],
    [400, 452],
    [310, 470],
    [292, 572],
  ],
];

/** Strands falling over the rim on the left of the face (mirrored on the right). */
const FRONT_STRANDS: Curve[] = [
  [
    [372, 566],
    [322, 572],
    [310, 660],
    [330, 812],
  ],
  [
    [412, 572],
    [372, 580],
    [360, 640],
    [376, 740],
  ],
];

/** String of pearls: a little mound of round beads, and strings falling over the pot. */
export const stringOfPearls: Foliage = {
  label: 'Plante chapelet',
  back: () => {
    const lit = artUrl('pearls-bead');
    const shaded = artUrl('pearls-bead-back');
    let body = '';
    for (const c of BACK_STRANDS) body += strand(c, 19, shaded) + strand(mirrored(c), 19, shaded);
    MOUND.forEach(([y, from, to, count], row) => {
      for (let i = 0; i < count; i++) {
        const x = from + ((to - from) * i) / (count - 1);
        // A little irregular, like real beads.
        const jitter = ((i * 7 + row * 3) % 5) - 2;
        body += pearl([x + jitter * 2, y + jitter * 3], 25, (i + row) % 3 === 0 ? shaded : lit);
      }
    });
    return {
      defs:
        linearGradient('pearls-bead', [0, 0, 1, 1], [
          [0, PEARL.light],
          [1, PEARL.dark],
        ]) +
        linearGradient('pearls-bead-back', [0, 0, 1, 1], [
          [0, LEAF.light],
          [1, PEARL.shade],
        ]),
      body,
    };
  },
  front: () => {
    const paint = artUrl('pearls-bead-front');
    let body = '';
    for (const c of FRONT_STRANDS) body += strand(c, 20, paint) + strand(mirrored(c), 20, paint);
    return {
      defs: linearGradient('pearls-bead-front', [0, 0, 1, 1], [
        [0, PEARL.light],
        [1, PEARL.dark],
      ]),
      body,
    };
  },
};
