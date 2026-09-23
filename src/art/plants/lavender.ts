import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import {
  colorKey,
  fill,
  line,
  oval,
  polar,
  pt,
  ribbonPath,
  shades,
  taper,
  type Curve,
  type Point,
} from './shapes-bloom';

const LAVENDER = '#9D83D9';

/** The silvery grey-green of Mediterranean shrubs. */
const SILVER = { light: '#8FBA8F', dark: '#55805F', deep: '#476F52', stem: '#6A9672' };

/** Where the stems come out, behind the rim. */
const BASE: Point = [512, 598];

/** Narrow leaves in a tuft around the base: angle and length. */
const BLADES: [angle: number, length: number][] = [
  [-78, 170],
  [80, 166],
  [-60, 190],
  [62, 186],
  [-42, 200],
  [44, 196],
  [-24, 190],
  [26, 186],
  [-8, 170],
  [10, 166],
];

/** Flower stems, back ones first: angle and length. */
const STEMS: [angle: number, length: number][] = [
  [-28, 350],
  [28, 344],
  [-12, 396],
  [14, 386],
  [-40, 290],
  [42, 284],
];

/** A tuft of lavender: silvery leaves and slender stems topped with flower spikes. */
export const lavender: Foliage = {
  label: 'Lavande et romarin',
  back: ({ accent = LAVENDER }) => {
    const s = shades(accent);
    const budId = `lavender-bud-${colorKey(accent)}`;
    const bud = artUrl(budId);
    let body = '';
    for (const [angle, length] of STEMS) {
      const top = polar(BASE, angle, length);
      const bow = polar(BASE, angle * 0.7, length * 0.5);
      body += line(`M ${pt(BASE)} Q ${pt(bow)} ${pt(top)}`, SILVER.stem, 8);
      // The spike: buds in pairs up the tip of the stem, smaller towards the top.
      const start = polar(BASE, angle, length * 0.7);
      for (let k = 0; k <= 7; k++) {
        const along = polar(start, angle, (length * 0.3 * k) / 7);
        const size = 22 - k * 1.6;
        const side = k % 2 === 0 ? 1 : -1;
        body += oval(polar(along, angle + 90 * side, 8), size * 0.8, size, bud, angle + 20 * side);
      }
    }
    for (const [angle, length] of BLADES) {
      const base = polar(BASE, angle, 16);
      const blade: Curve = [
        base,
        polar(base, angle * 0.6, length * 0.4),
        polar(base, angle, length * 0.8),
        polar(base, angle * 1.15, length),
      ];
      body += fill(ribbonPath(blade, taper(36, 0.8)), artUrl(angle < 0 ? 'lavender-leaf-left' : 'lavender-leaf-right'));
    }
    return {
      defs:
        linearGradient('lavender-leaf-left', [0, 0, 1, 1], [
          [0, SILVER.light],
          [1, SILVER.dark],
        ]) +
        linearGradient('lavender-leaf-right', [1, 0, 0, 1], [
          [0, SILVER.light],
          [1, SILVER.deep],
        ]) +
        linearGradient(budId, [0, 0, 1, 1], [
          [0, s.light],
          [1, s.shade],
        ]),
      body,
    };
  },
};
