import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { bloom, bloomHeart, colorKey, fill, leafPath, line, midribPath, polar, shades, type Point } from './shapes-bloom';

const CORAL = '#F77B86';

/** Where the stems come out, behind the rim. */
const BASE: Point = [512, 584];

/** Rounded leaves making a mound, back ones first: angle, length and width. */
const LEAVES: [angle: number, length: number, width: number][] = [
  [-20, 250, 132],
  [22, 244, 132],
  [-52, 240, 128],
  [54, 236, 128],
  [-80, 200, 116],
  [82, 196, 116],
  [-4, 180, 120],
];

/** The blooms, back ones first: center, radius and turn. */
const BLOOMS: [center: Point, radius: number, turn: number][] = [
  [[512, 286], 62, 0],
  [[404, 348], 58, 20],
  [[622, 344], 58, -12],
  [[456, 432], 60, 8],
  [[574, 428], 62, 30],
];

/** A leafy mound covered in round, cheerful blooms. */
export const flowers: Foliage = {
  label: 'Fleurs',
  back: ({ accent = CORAL }) => {
    const s = shades(accent);
    const key = colorKey(accent);
    const petal = artUrl(`flowers-petal-${key}`);
    let body = '';
    for (const [angle, length, width] of LEAVES) {
      const base = polar(BASE, angle, 20);
      const tip = polar(BASE, angle, length);
      const bend = angle < 0 ? 10 : -10;
      const paint = artUrl(angle < 0 ? 'flowers-left' : 'flowers-right');
      body +=
        fill(leafPath(base, tip, width, { bend, round: 0.95, full: 0.5 }), paint) +
        line(midribPath(base, tip, bend, 0.2, 0.8), LEAF.vein, 9, 0.6);
    }
    for (const [center, radius, turn] of BLOOMS) {
      body += bloom(center, radius, petal, bloomHeart(accent), { turn });
    }
    return {
      defs:
        linearGradient('flowers-left', [0, 0, 1, 1], [
          [0, LEAF.light],
          [1, LEAF.dark],
        ]) +
        linearGradient('flowers-right', [1, 0, 0, 1], [
          [0, LEAF.mid],
          [1, LEAF.deep],
        ]) +
        linearGradient(`flowers-petal-${key}`, [0, 0, 1, 1], [
          [0, s.light],
          [1, s.shade],
        ]),
      body,
    };
  },
};
