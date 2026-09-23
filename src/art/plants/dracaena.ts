import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { bezierAt, bezierDir, fillPath, lance, leafGradients, polar, ribbon, smooth, strokePath, vein } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** The cane's bark, lit from the left, and the rings left by old leaves. */
const CANE: [string, string] = ['#C9A073', '#93704B'];
const RING = '#E8CBA0';

/** A cane from the soil (Bézier control points), ringed where old leaves fell. */
function cane(spine: Pt[], width: number): string {
  const rings = [0.2, 0.36, 0.52, 0.68, 0.84]
    .map((t) => {
      const p = bezierAt(spine, t);
      const [tx, ty] = bezierDir(spine, t);
      const w = width * 0.62;
      const at = (v: number, u: number): Pt => [p[0] - ty * v + tx * u, p[1] + tx * v + ty * u];
      return strokePath(smooth([at(-w, 0), at(0, -4), at(w, 0)]), RING, 4, 0.8);
    })
    .join('');
  return fillPath(ribbon(spine, (s) => width * (1 - s * 0.15)), artUrl('dracaena-cane')) + rings;
}

/** A spiky tuft of long narrow leaves at the top of a cane. */
function tuft(top: Pt, size: number): string {
  const angles = [-112, -86, -62, -38, -14, 10, 34, 58, 82, 108];
  return angles
    .map((angle) => {
      const length = size * (1 - Math.abs(angle) / 360);
      const droop = Math.abs(angle) * 0.55;
      const mid = polar(top, angle * 0.85, length * 0.55);
      const end = polar(top, angle, length);
      const spine: Pt[] = [top, mid, [end[0], end[1] + droop]];
      const paint = artUrl(angle < 0 ? 'dracaena-leaf-l' : 'dracaena-leaf-r');
      const s = (t: number) => bezierAt(spine, t);
      return fillPath(ribbon(spine, lance(14, 0.3, 7)), paint) + vein(smooth([s(0.2), s(0.5), s(0.78)]), 5, 0.7);
    })
    .join('');
}

/** Dracaena, yucca and other cane plants: bare canes topped with tufts of long narrow leaves. */
export const dracaena: Foliage = {
  label: 'Dracaena',
  back: () => ({
    defs:
      leafGradients('dracaena-leaf') +
      linearGradient('dracaena-cane', [0, 0, 1, 0], [
        [0, CANE[0]],
        [1, CANE[1]],
      ]),
    body:
      cane([[540, 620], [548, 500], [594, 424]], 13) +
      tuft([594, 424], 148) +
      cane([[488, 620], [480, 460], [440, 338]], 14) +
      tuft([440, 338], 154),
  }),
};
