import { LEAF } from '../palette';
import { artUrl, linearGradient, mix } from '../svg';
import type { Foliage } from '../types';

import {
  SAGE,
  besideCurve,
  fill,
  halfRibbonPath,
  oval,
  polar,
  pt,
  ribbonPath,
  type Curve,
  type Point,
} from './shapes-bloom';

/** Between the leaf greens and the succulents' blue-green. */
const ALOE = {
  light: mix(LEAF.light, SAGE.light, 0.45),
  dark: mix(LEAF.dark, SAGE.deep, 0.5),
  deep: mix(LEAF.deep, SAGE.deep, 0.4),
  speckle: '#E8F7E6',
};

type Leaf = { angle: number; length: number; width: number };

/** Back leaves first. */
const LEAVES: Leaf[] = [
  { angle: -14, length: 310, width: 104 },
  { angle: 17, length: 296, width: 104 },
  { angle: -43, length: 268, width: 98 },
  { angle: 45, length: 262, width: 98 },
  { angle: -70, length: 208, width: 90 },
  { angle: 72, length: 204, width: 90 },
  { angle: 2, length: 236, width: 108 },
];

/** Where the leaves come out, behind the rim. */
const BASE: Point = [512, 594];

/** A leaf rising from the base, curving outwards. */
function leafCurve({ angle, length }: Leaf): Curve {
  const base = polar(BASE, angle, 20);
  return [
    base,
    polar(base, angle * 0.5, length * 0.4),
    polar(base, angle * 0.95, length * 0.75),
    polar(base, angle * 1.15, length),
  ];
}

/** The width of a leaf `widest` at its foot: fleshy, tapering to a point. */
const leafWidth = (widest: number) => (t: number) => widest * Math.pow(1 - t, 0.7);

/** Small soft teeth along an edge, `side` 1 on the right-hand one. */
function teeth(c: Curve, width: (t: number) => number, side: 1 | -1): string {
  let body = '';
  for (const t of [0.3, 0.46, 0.62]) {
    const half = width(t) / 2;
    const a = besideCurve(c, t - 0.03, side * (half - 4));
    const b = besideCurve(c, t + 0.03, side * (half - 4));
    const tip = besideCurve(c, t + 0.04, side * (half + 8));
    // Stroked in their own color, to round them off.
    body +=
      `<path d="M ${pt(a)} L ${pt(tip)} L ${pt(b)} Z" fill="${ALOE.light}" ` +
      `stroke="${ALOE.light}" stroke-width="6" stroke-linejoin="round"/>`;
  }
  return body;
}

/** An aloe: chubby upright leaves from a rosette, speckled, softly toothed. */
export const aloe: Foliage = {
  label: 'Aloe et agave',
  back: () => {
    let body = '';
    LEAVES.forEach((leaf, i) => {
      const c = leafCurve(leaf);
      const w = leafWidth(leaf.width);
      const right = leaf.angle > 0;
      // The two back leaves sit in the shade of the others.
      const paint = i < 2 ? 'aloe-back' : right ? 'aloe-right' : 'aloe-left';
      body +=
        teeth(c, w, 1) +
        teeth(c, w, -1) +
        fill(ribbonPath(c, w), artUrl(paint)) +
        fill(halfRibbonPath(c, w, right ? 1 : -1), ALOE.deep, 0.2);
      // Pale speckles, in loose rows.
      for (const [t, across] of [
        [0.2, 0.22],
        [0.3, -0.24],
        [0.4, 0.2],
        [0.5, -0.18],
        [0.6, 0.14],
      ] as const) {
        const p = besideCurve(c, t, across * w(t));
        body += oval(p, 9, 5, ALOE.speckle, leaf.angle - 90, 0.7);
      }
    });
    return {
      defs:
        linearGradient('aloe-back', [0, 0, 1, 1], [
          [0, ALOE.dark],
          [1, ALOE.deep],
        ]) +
        linearGradient('aloe-left', [0, 0, 1, 1], [
          [0, ALOE.light],
          [1, ALOE.dark],
        ]) +
        linearGradient('aloe-right', [1, 0, 0, 1], [
          [0, ALOE.light],
          [1, ALOE.deep],
        ]),
      body,
    };
  },
};
