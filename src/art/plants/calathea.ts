import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { fillPath, frame, leaf, smooth, stem, strokePath, vein } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** The pale green of the painted leaves, and their pink midrib. */
const PALE: [string, string] = ['#A6DBA0', '#5FB06D'];
const PINK = '#F4A6B7';

/** The purple underside of a leaf. */
const UNDERSIDE: [string, string] = ['#C07099', '#86406C'];

/** Where the painted feathers sit along the midrib, and their size. */
const FEATHERS: [number, number][] = [
  [0.2, 0.2],
  [0.33, 0.27],
  [0.47, 0.27],
  [0.61, 0.22],
  [0.74, 0.15],
];

/** A painted leaf on its stalk: pale, dark feathered marks along a pink midrib. */
function paintedLeaf(from: Pt, base: Pt, angle: number, length: number, paint: string): string {
  const f = frame(base, angle);
  const width = length * 0.58;
  const marks = FEATHERS.flatMap(([u, size]) =>
    [-1, 1].map((side) => leaf(f(length * u, 0), angle + side * 56, length * size, length * size * 0.42, { round: 0.6 })),
  ).join(' ');
  return (
    stem(smooth([from, [(from[0] + base[0]) / 2, (from[1] + base[1]) / 2 + 8], base, f(length * 0.1, 0)]), 9) +
    fillPath(leaf(base, angle, length, width, { round: 0.55 }), paint) +
    fillPath(marks, LEAF.dark, 0.85) +
    strokePath(smooth([f(length * 0.06, 0), f(length * 0.5, 0), f(length * 0.86, 0)]), PINK, 7)
  );
}

/** A leaf turned over, showing its purple underside. */
function turnedLeaf(from: Pt, base: Pt, angle: number, length: number): string {
  const f = frame(base, angle);
  return (
    stem(smooth([from, [(from[0] + base[0]) / 2, (from[1] + base[1]) / 2 + 8], base, f(length * 0.1, 0)]), 9) +
    fillPath(leaf(base, angle, length, length * 0.5, { round: 0.55 }), artUrl('calathea-under')) +
    vein(smooth([f(length * 0.06, 0), f(length * 0.5, 0), f(length * 0.86, 0)]), 7, 0.5)
  );
}

/** Calathea and other prayer plants: oval leaves painted with dark feathers and pink. */
export const calathea: Foliage = {
  label: 'Calathea',
  back: () => {
    const [l, r] = [artUrl('calathea-leaf-l'), artUrl('calathea-leaf-r')];
    return {
      defs:
        linearGradient('calathea-leaf-l', [0, 0, 1, 1], [
          [0, PALE[0]],
          [1, PALE[1]],
        ]) +
        linearGradient('calathea-leaf-r', [1, 0, 0, 1], [
          [0, PALE[0]],
          [1, PALE[1]],
        ]) +
        linearGradient('calathea-under', [0, 0, 1, 1], [
          [0, UNDERSIDE[0]],
          [1, UNDERSIDE[1]],
        ]),
      body:
        turnedLeaf([520, 600], [590, 370], 20, 172) +
        paintedLeaf([492, 600], [424, 500], -66, 190, l) +
        paintedLeaf([532, 600], [602, 496], 64, 190, r) +
        paintedLeaf([502, 600], [470, 424], -28, 200, l) +
        paintedLeaf([520, 600], [552, 436], 26, 192, r),
    };
  },
};
