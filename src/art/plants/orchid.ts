import { LEAF } from '../palette';
import { artUrl, linearGradient, mix } from '../svg';
import type { Foliage } from '../types';

import { colorKey, dot, fill, leafPath, line, midribPath, oval, polar, shades, type Point } from './shapes-bloom';

const PINK = '#F4A9C8';

/** The bamboo stake the flower stem is tied to. */
const STAKE = { color: '#D9B27A', knot: '#B98E57' };

/** A moth orchid flower facing us: three sepals, two round petals and a little lip. */
function flower(center: Point, size: number, petal: string, sepal: string, lip: string): string {
  const leaf = (angle: number, length: number, width: number, paint: string, round: number) =>
    fill(leafPath(center, polar(center, angle, length), width, { round, full: 0.4 }), paint);
  return (
    leaf(0, size * 0.95, size * 0.62, sepal, 0.7) +
    leaf(148, size * 0.9, size * 0.5, sepal, 0.6) +
    leaf(-148, size * 0.9, size * 0.5, sepal, 0.6) +
    leaf(78, size * 1.02, size * 1, petal, 1) +
    leaf(-78, size * 1.02, size * 1, petal, 1) +
    oval([center[0], center[1] + size * 0.26], size * 0.2, size * 0.26, lip) +
    oval([center[0] - size * 0.2, center[1] + size * 0.06], size * 0.12, size * 0.08, lip, -30) +
    oval([center[0] + size * 0.2, center[1] + size * 0.06], size * 0.12, size * 0.08, lip, 30) +
    dot([center[0], center[1] - size * 0.06], size * 0.11, '#FFE08A')
  );
}

/** Where the flowers sit along the arching stem, from the oldest to the youngest. */
const FLOWERS: [x: number, y: number, size: number][] = [
  [470, 292, 70],
  [584, 250, 68],
  [688, 290, 60],
];

/** Broad leaves, low in the pot. */
const LEAVES: [base: Point, tip: Point, width: number, bend: number, paint: string][] = [
  [[520, 566], [714, 462], 124, -14, 'orchid-leaf-right'],
  [[504, 566], [306, 480], 128, 14, 'orchid-leaf-left'],
];

const STEM = 'M 492 580 C 478 480 470 400 470 330 C 470 250 540 210 610 226 C 670 240 712 276 736 332';

/** A moth orchid: broad leaves low in the pot, and an arching stem of flowers on a stake. */
export const orchid: Foliage = {
  label: 'Orchidée',
  back: ({ accent = PINK }) => {
    const s = shades(accent);
    const key = colorKey(accent);
    const petal = artUrl(`orchid-petal-${key}`);
    const sepal = artUrl(`orchid-sepal-${key}`);
    const lip = mix(accent, '#B0306A', 0.55);
    let body = line('M 470 596 L 470 250', STAKE.color, 8) + line(STEM, LEAF.stem, 8);
    for (const [base, tip, width, bend, paint] of LEAVES) {
      body +=
        fill(leafPath(base, tip, width, { bend, round: 0.85, full: 0.6 }), artUrl(paint)) +
        line(midribPath(base, tip, bend, 0.15, 0.8), LEAF.vein, 9, 0.6);
    }
    // The tie on the stake, the bud at the tip, then the flowers from the youngest,
    // so the older ones come on top.
    body +=
      line('M 462 452 L 478 446', STAKE.knot, 6) +
      oval([742, 350], 17, 23, sepal, -20) +
      FLOWERS.slice()
        .reverse()
        .map(([x, y, size]) => flower([x, y], size, petal, sepal, lip))
        .join('');
    return {
      defs:
        linearGradient('orchid-leaf-left', [0, 0, 1, 1], [
          [0, LEAF.light],
          [1, LEAF.dark],
        ]) +
        linearGradient('orchid-leaf-right', [1, 0, 0, 1], [
          [0, LEAF.mid],
          [1, LEAF.deep],
        ]) +
        linearGradient(`orchid-petal-${key}`, [0, 0, 1, 1], [
          [0, s.light],
          [1, s.base],
        ]) +
        linearGradient(`orchid-sepal-${key}`, [0, 0, 1, 1], [
          [0, s.base],
          [1, s.shade],
        ]),
      body,
    };
  },
};
