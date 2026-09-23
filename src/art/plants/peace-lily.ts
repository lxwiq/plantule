import { LEAF } from '../palette';
import { artUrl, lighten, linearGradient, mix } from '../svg';
import type { Foliage } from '../types';

import {
  colorKey,
  fill,
  halfLeafPath,
  leafPath,
  line,
  lineGradient,
  midribPath,
  oval,
  polar,
  pt,
  type Point,
} from './shapes-bloom';

const CREAM = '#FFF8E9';

/** Deeper than the logo's greens, for glossy dark leaves. */
const GLOSS = { deep: '#1C4A29', shadow: '#143A20' };

/** Where the stems come out, behind the rim. */
const BASE: Point = [512, 590];

/** Glossy dark leaves, back ones first: angle, length and width. */
const LEAVES: [angle: number, length: number, width: number][] = [
  [-14, 300, 118],
  [22, 290, 116],
  [-44, 280, 120],
  [50, 270, 116],
  [-72, 236, 108],
  [76, 228, 104],
];

/** The flowers: where the stem ends, where the spathe points, and its size. */
const SPATHES: [base: Point, tip: Point, width: number][] = [
  [[448, 356], [426, 196], 104],
  [[594, 382], [624, 250], 88],
];

const SPATHE_SHAPE = { round: 0.45, full: 0.5 };

/** A peace lily: glossy dark leaves and white spathes, each around its spadix. */
export const peaceLily: Foliage = {
  label: 'Fleur de lune',
  back: ({ accent = CREAM }) => {
    const key = colorKey(accent);
    const spadix = mix('#F6D776', accent, 0.15);
    let defs =
      linearGradient('peace-lily-left', [0, 0, 1, 1], [
        [0, LEAF.mid],
        [1, LEAF.deep],
      ]) +
      linearGradient('peace-lily-right', [1, 0, 0, 1], [
        [0, LEAF.mid],
        [1, GLOSS.deep],
      ]) +
      linearGradient(`peace-lily-spadix-${key}`, [0, 0, 1, 0], [
        [0, lighten(spadix, 0.3)],
        [1, spadix],
      ]);
    let body = '';
    LEAVES.forEach(([angle, length, width], i) => {
      const base = polar(BASE, angle, 24);
      const tip = polar(BASE, angle * 1.08, length);
      const bend = angle < 0 ? 22 : -22;
      const shape = { bend, round: 0.2, full: 0.15 };
      const outline = leafPath(base, tip, width, shape);
      body +=
        fill(outline, artUrl(angle < 0 ? 'peace-lily-left' : 'peace-lily-right')) +
        // The back pair in the shade of the others.
        (i < 2 ? fill(outline, GLOSS.shadow, 0.25) : '') +
        fill(halfLeafPath(base, tip, width, shape, angle < 0 ? -1 : 1), GLOSS.shadow, 0.18) +
        line(midribPath(base, tip, bend, 0.18, 0.82), LEAF.vein, 9, 0.6);
    });
    SPATHES.forEach(([base, tip, width], i) => {
      const id = `peace-lily-spathe-${key}-${i}`;
      defs += lineGradient(id, base, tip, [
        [0, mix(accent, LEAF.light, 0.45)],
        [0.35, accent],
        [1, lighten(accent, 0.55)],
      ]);
      const foot: Point = [BASE[0] + (base[0] - BASE[0]) * 0.2, BASE[1]];
      const bow: Point = [base[0], (foot[1] + base[1]) / 2];
      const lean = (tip[0] - base[0]) * 0.3;
      body +=
        line(`M ${pt(foot)} Q ${pt(bow)} ${pt(base)}`, LEAF.stem, 8) +
        fill(leafPath(base, tip, width, SPATHE_SHAPE), artUrl(id)) +
        fill(halfLeafPath(base, tip, width, SPATHE_SHAPE, 1), mix(accent, '#7A5A4A', 0.5), 0.12);
      // The spadix, standing in the spathe.
      body += oval(polar(polar(base, 0, 24), lean, 34), 11, 36, artUrl(`peace-lily-spadix-${key}`), lean);
    });
    return { defs, body };
  },
};
