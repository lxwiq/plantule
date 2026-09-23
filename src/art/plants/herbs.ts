import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { fill, leafPath, line, midribPath, polar, pt, type Point } from './shapes-bloom';

/** Fresh, bright greens: basil, mint, parsley. */
const HERB = {
  light: '#A4DE78',
  mid: '#86CC62',
  dark: '#4E9E45',
  deep: '#3F8A3C',
  stem: '#5FA64E',
  vein: '#E2F8CF',
};

/** Where the stems come out, behind the rim. */
const BASE: Point = [512, 596];

/** Stems, outer ones first: angle and length. */
const STEMS: [angle: number, length: number][] = [
  [-46, 214],
  [48, 208],
  [-20, 262],
  [22, 254],
  [0, 290],
];

/** A small rounded leaf, lit from the top left, darker when `shaded`. */
function leaf(base: Point, angle: number, length: number, shaded: boolean): string {
  const tip = polar(base, angle, length);
  const bend = angle < 0 ? 6 : -6;
  const paint = artUrl(shaded ? 'herbs-back' : angle < 0 ? 'herbs-left' : 'herbs-right');
  return (
    fill(leafPath(base, tip, length * 0.66, { bend, round: 0.6, full: 0.55 }), paint) +
    line(midribPath(base, tip, bend, 0.2, 0.72), HERB.vein, 6, 0.7)
  );
}

/** A bushy culinary herb: stems of bright, rounded leaves in pairs. */
export const herbs: Foliage = {
  label: 'Aromatiques',
  back: () => {
    let body = '';
    STEMS.forEach(([angle, length], i) => {
      // The outer stems grow behind the others, in their shade.
      const shaded = i < 2;
      const top = polar(BASE, angle, length);
      const bow = polar(BASE, angle * 0.6, length * 0.5);
      body += line(`M ${pt(BASE)} Q ${pt(bow)} ${pt(top)}`, HERB.stem, 9);
      // Pairs of leaves along the stem, smaller towards the top, then a tuft.
      for (const [t, size, spread] of [
        [0.42, 112, 66],
        [0.68, 102, 58],
      ] as const) {
        const at = polar(BASE, angle * (0.6 + 0.4 * t), length * t);
        body += leaf(at, angle - spread, size, shaded) + leaf(at, angle + spread, size, shaded);
      }
      body += leaf(top, angle - 34, 86, shaded) + leaf(top, angle + 34, 86, shaded) + leaf(top, angle, 94, shaded);
    });
    return {
      defs:
        linearGradient('herbs-back', [0, 0, 1, 1], [
          [0, HERB.mid],
          [1, HERB.deep],
        ]) +
        linearGradient('herbs-left', [0, 0, 1, 1], [
          [0, HERB.light],
          [1, HERB.dark],
        ]) +
        linearGradient('herbs-right', [1, 0, 0, 1], [
          [0, HERB.mid],
          [1, HERB.deep],
        ]),
      body,
    };
  },
};
