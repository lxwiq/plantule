import { LEAF } from '../palette';
import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { bezierAt, bezierDir, bezierUntil, fillPath, leafGradients, ribbon, smooth, strokePath } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** The golden margins of the leaves. */
const MARGIN = '#E8D274';

/** The half width of a sword leaf: straight sides, a short pointed tip. */
const sword = (width: number) => (s: number) =>
  width * (0.92 + 0.1 * Math.sin(Math.PI * s)) * (s < 0.62 ? 1 : Math.cos(((s - 0.62) / 0.38) * (Math.PI / 2)) ** 0.8);

/** A sword leaf from the soil (spine: Bézier control points), golden margin, pale wavy bands. */
function swordLeaf(spine: Pt[], width: number, paint: string): string {
  const rim = 8;
  const inner = bezierUntil(spine, 0.965);
  const innerWidth = (s: number) => Math.max(0, sword(width)(s * 0.965) - rim);
  const bands = [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72]
    .map((s, i) => {
      const w = innerWidth(s) - 6;
      if (w < 8) return '';
      const p = bezierAt(inner, s);
      const [tx, ty] = bezierDir(inner, s);
      const at = (v: number, u: number): Pt => [p[0] - ty * v + tx * u, p[1] + tx * v + ty * u];
      const wave = i % 2 === 0 ? 7 : -7;
      return strokePath(smooth([at(-w, 0), at(-w / 2, wave), at(0, 0), at(w / 2, -wave), at(w, 0)]), LEAF.vein, 7, 0.4);
    })
    .join('');
  return fillPath(ribbon(spine, sword(width)), MARGIN) + fillPath(ribbon(inner, innerWidth), paint) + bands;
}

/** Sansevieria: upright sword leaves, banded, with golden margins. */
export const snake: Foliage = {
  label: 'Sansevieria',
  back: () => {
    const [l, r] = [artUrl('snake-leaf-l'), artUrl('snake-leaf-r')];
    return {
      defs: leafGradients('snake-leaf', [LEAF.light, LEAF.deep], [LEAF.mid, LEAF.deep]),
      body:
        swordLeaf([[486, 610], [470, 390], [404, 206]], 38, l) +
        swordLeaf([[538, 610], [552, 400], [614, 232]], 38, r) +
        swordLeaf([[512, 610], [524, 380], [502, 168]], 42, l) +
        swordLeaf([[488, 614], [440, 440], [330, 318]], 36, l) +
        swordLeaf([[538, 614], [590, 450], [692, 330]], 36, r),
    };
  },
};
