import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { colorKey, fill, fruit, leafPath, line, midribPath, polar, pt, shades, type Point } from './shapes-bloom';

const TOMATO = '#F0503C';

/** The bamboo stake the stem is tied to. */
const STAKE = { color: '#D9B27A', knot: '#B98E57' };

/** A leaflet from `base`, `angle` degrees from upright. */
function leaflet(base: Point, angle: number, size: number): string {
  const tip = polar(base, angle, size);
  const paint = artUrl(angle < 0 ? 'veggie-leaf-left' : 'veggie-leaf-right');
  return (
    fill(leafPath(base, tip, size * 0.58, { round: 0.5, full: 0.4 }), paint) +
    line(midribPath(base, tip, 0, 0.2, 0.7), LEAF.vein, 5, 0.6)
  );
}

/** A compound leaf: a stalk with a pair of leaflets and one at its end. */
function compoundLeaf(base: Point, angle: number, length: number): string {
  const tip = polar(base, angle, length);
  const pair = polar(base, angle, length * 0.5);
  return (
    line(`M ${pt(base)} L ${pt(tip)}`, LEAF.stem, 8) +
    leaflet(pair, angle - 62, 76) +
    leaflet(pair, angle + 62, 76) +
    leaflet(tip, angle, 92)
  );
}

/** The green star on top of a fruit, and its stalk. */
function calyx([x, y]: Point, r: number): string {
  const top: Point = [x, y - r * 0.82];
  let body = line(`M ${pt(top)} L ${pt([x + 2, y - r - 12])}`, LEAF.stem, 6);
  for (const turn of [-100, -50, 50, 100, 180]) {
    body += fill(leafPath(top, polar(top, turn, r * 0.5), r * 0.24, { round: 0.2 }), LEAF.mid);
  }
  return body;
}

/** Fruits on the plant, in two trusses. */
const FRUITS: [Point, number][] = [
  [[424, 430], 37],
  [[472, 466], 33],
  [[416, 498], 30],
  [[646, 380], 37],
  [[614, 432], 32],
];

/** A vegetable plant tied to its stake: a winding stem, leaves and round, bright fruits. */
export const veggie: Foliage = {
  label: 'Potager',
  back: ({ accent = TOMATO }) => {
    const s = shades(accent);
    const key = colorKey(accent);
    let body =
      line('M 566 598 L 566 236', STAKE.color, 10) +
      line('M 512 598 C 500 514 566 486 552 410 C 540 344 572 316 556 258', LEAF.stem, 12) +
      compoundLeaf([524, 528], -72, 132) +
      compoundLeaf([550, 476], 68, 126) +
      compoundLeaf([546, 394], -54, 120) +
      compoundLeaf([556, 330], 50, 112) +
      // The young top.
      leaflet([556, 262], -44, 70) +
      leaflet([556, 262], 40, 66) +
      leaflet([556, 262], -4, 80) +
      line('M 556 444 L 576 438', STAKE.knot, 7) +
      line('M 552 346 L 574 340', STAKE.knot, 7);
    for (const [c, r] of FRUITS) body += fruit(c, r, artUrl(`veggie-fruit-${key}`)) + calyx(c, r);
    return {
      defs:
        linearGradient('veggie-leaf-left', [0, 0, 1, 1], [
          [0, LEAF.light],
          [1, LEAF.dark],
        ]) +
        linearGradient('veggie-leaf-right', [1, 0, 0, 1], [
          [0, LEAF.mid],
          [1, LEAF.deep],
        ]) +
        linearGradient(`veggie-fruit-${key}`, [0, 0, 1, 1], [
          [0, s.light],
          [0.35, s.base],
          [1, s.shade],
        ]),
      body,
    };
  },
};
