import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { fillPath, frame, leaf, smooth, stem, strokePath } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** A leaf coloring: gradient of its margin, the splash down its middle, and its veins. */
type Coloring = { light: string; dark: string; splash: string; vein: string };

/** Coleus, croton and begonia colors, warm like the pot. */
const COLORINGS: Record<string, Coloring> = {
  plum: { light: '#B16DAA', dark: '#733C79', splash: '#EE86A4', vein: '#F9C9D6' },
  lime: { light: '#CFE07A', dark: '#8CB04E', splash: '#C9466E', vein: '#F6ECB0' },
  rose: { light: '#F6A0B0', dark: '#D0587A', splash: '#F7CF6C', vein: '#FFE2E8' },
  gold: { light: '#F6CF6A', dark: '#E28E40', splash: '#E4604E', vein: '#FFF0B8' },
  green: { light: LEAF.light, dark: LEAF.dark, splash: '#F08AA2', vein: LEAF.vein },
};

const PROFILE: [number, number, number, number] = [0.84, 1, 0.78, 0.38];

/** A broad colorful leaf: a splash of another color down its middle, bright veins. */
function colorLeaf(base: Pt, angle: number, length: number, coloring: string): string {
  const c = COLORINGS[coloring];
  const f = frame(base, angle);
  const width = length * 0.72;
  const laterals = [0.3, 0.5, 0.68]
    .flatMap((u, i) =>
      [-1, 1].map((side) => smooth([f(length * u, 0), f(length * (u + 0.07), side * width * (0.2 - i * 0.03)), f(length * (u + 0.1), side * width * (0.34 - i * 0.06))])),
    )
    .map((d) => strokePath(d, c.vein, 5, 0.7))
    .join('');
  return (
    fillPath(leaf(base, angle, length, width, { profile: PROFILE }), artUrl(`colorful-${coloring}`)) +
    fillPath(leaf(f(length * 0.1, 0), angle, length * 0.74, width * 0.5, { profile: PROFILE }), c.splash, 0.9) +
    laterals +
    strokePath(smooth([f(length * 0.06, 0), f(length * 0.5, 0), f(length * 0.86, 0)]), c.vein, 7, 0.85)
  );
}

/** Pairs of leaves up the stem, bottom to top: height, angle, length, colorings. */
const PAIRS: [number, number, number, string, string][] = [
  [506, 74, 184, 'plum', 'plum'],
  [404, 48, 162, 'lime', 'lime'],
  [314, 22, 128, 'rose', 'gold'],
];

/** Colorful foliage: coleus, croton, begonia… pairs of painted leaves up a stem. */
export const colorful: Foliage = {
  label: 'Feuillage coloré',
  back: () => ({
    defs: Object.entries(COLORINGS)
      .map(([name, c]) =>
        linearGradient(`colorful-${name}`, [0, 0, 1, 1], [
          [0, c.light],
          [1, c.dark],
        ]),
      )
      .join(''),
    body:
      stem(smooth([[512, 600], [514, 440], [510, 280]]), 14) +
      PAIRS.map(
        ([y, angle, length, left, right]) => colorLeaf([512, y], -angle, length, left) + colorLeaf([512, y - 6], angle, length, right),
      ).join('') +
      colorLeaf([510, 282], -4, 100, 'green'),
  }),
};
