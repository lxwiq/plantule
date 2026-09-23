import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import {
  colorKey,
  fill,
  halfLeafPath,
  halfRibbonPath,
  leafPath,
  lineGradient,
  polar,
  ribbonPath,
  shades,
  type Curve,
  type Point,
} from './shapes-bloom';

const FLAME = '#F2603E';

/** The heart of the rosette, behind the rim. */
const BASE: Point = [512, 596];

/** A strap leaf rising from the heart and arching out, `angle` degrees from upright. */
function strap(angle: number, length: number): Curve {
  const base = polar(BASE, angle, 18);
  const out = Math.sign(angle) * 18;
  return [
    base,
    polar(base, angle * 0.35, length * 0.45),
    polar(base, angle + out * 0.5, length * 0.82),
    polar(base, angle * 1.2 + out, length),
  ];
}

/** The width of a strap leaf: even, then a quick point. */
const strapWidth = (widest: number) => (t: number) => widest * Math.pow(1 - Math.pow(t, 4), 0.6);

/** Leaves behind the flower, then around it: angle, length and width. */
const BACK: [angle: number, length: number, width: number][] = [
  [-22, 280, 50],
  [24, 272, 50],
];
const FRONT: [angle: number, length: number, width: number][] = [
  [-50, 270, 52],
  [52, 266, 52],
  [-76, 236, 50],
  [78, 232, 50],
  [-10, 170, 54],
  [12, 164, 54],
];

/** The bracts of the flower spike, outer ones first: angle, length and width. */
const BRACTS: [angle: number, length: number, width: number][] = [
  [-36, 128, 64],
  [36, 124, 64],
  [-18, 186, 70],
  [18, 182, 70],
  [0, 250, 78],
];

/** A bromeliad: a rosette of strappy arching leaves around a tall, bright flower spike. */
export const bromeliad: Foliage = {
  label: 'Broméliacée',
  back: ({ accent = FLAME }) => {
    const s = shades(accent);
    const key = colorKey(accent);
    let defs =
      linearGradient('bromeliad-left', [0, 0, 1, 1], [
        [0, LEAF.light],
        [1, LEAF.dark],
      ]) +
      linearGradient('bromeliad-right', [1, 0, 0, 1], [
        [0, LEAF.mid],
        [1, LEAF.deep],
      ]);
    const leaf = ([angle, length, width]: [number, number, number]) => {
      const c = strap(angle, length);
      const w = strapWidth(width);
      return (
        fill(ribbonPath(c, w), artUrl(angle < 0 ? 'bromeliad-left' : 'bromeliad-right')) +
        fill(halfRibbonPath(c, w, angle < 0 ? -1 : 1), LEAF.deep, 0.25)
      );
    };
    let body = BACK.map(leaf).join('');
    const heart = polar(BASE, 0, 110);
    BRACTS.forEach(([angle, length, width], i) => {
      const base = polar(heart, angle, 10);
      const tip = polar(heart, angle, length);
      const id = `bromeliad-bract-${key}-${i}`;
      defs += lineGradient(id, base, tip, [
        [0, s.shade],
        [0.55, s.base],
        [1, s.light],
      ]);
      const shape = { round: 0.15, full: 0.6 };
      body +=
        fill(leafPath(base, tip, width, shape), artUrl(id)) +
        fill(halfLeafPath(base, tip, width, shape, angle < 0 ? -1 : 1), s.deep, 0.2);
    });
    body += FRONT.map(leaf).join('');
    return { defs, body };
  },
};
