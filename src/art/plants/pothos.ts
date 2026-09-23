import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { bezierAngle, bezierAt, curve, fillPath, frame, heart, leaf, leafGradients, smooth, stem, vein } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** The golden streaks of a variegated pothos. */
const GOLD = '#EFE39A';

/**
 * A pothos leaf: a heart with a midrib, and golden streaks on one side
 * (`gold` 1 or -1) or none (0).
 */
function pothosLeaf(base: Pt, angle: number, length: number, paint: string, gold = 0, bend = 0): string {
  const f = frame(base, angle, bend, length);
  const streaks = gold
    ? fillPath(
        leaf(f(length * 0.22, gold * length * 0.03), angle + gold * 42, length * 0.34, length * 0.09) +
          ' ' +
          leaf(f(length * 0.46, gold * length * 0.02), angle + gold * 36, length * 0.26, length * 0.07),
        GOLD,
        0.85,
      )
    : '';
  return (
    fillPath(heart(base, angle, length, length * 0.8, { bend }), paint) +
    streaks +
    vein(smooth([f(length * 0.1, 0), f(length * 0.45, 0), f(length * 0.8, 0)]), length > 100 ? 9 : 7)
  );
}

/** A vine hanging from the rim (Bézier control points), leaves alternating along it. */
function vine(spine: Pt[], leaves: number[], paints: [string, string], size: number): string {
  return (
    stem(curve(spine), 8) +
    leaves
      .map((t, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const angle = bezierAngle(spine, t) + side * (t > 0.95 ? 0 : 52);
        const length = size * (1 - t * 0.28);
        return pothosLeaf(bezierAt(spine, t), angle, length, paints[i % 2], i % 3 === 1 ? -side : 0, side * 0.06);
      })
      .join('')
  );
}

/** The leaves on top of the pot: where each one starts, its angle, length and golden side. */
const MOUND: [Pt, number, number, number][] = [
  [[462, 392], -34, 128, 1],
  [[566, 378], 26, 132, 0],
  [[446, 520], -68, 136, 0],
  [[580, 516], 64, 136, -1],
  [[490, 462], -14, 148, -1],
  [[540, 470], 24, 142, 0],
];

/** Pothos and other vines: a mound of heart leaves, and vines trailing down both sides of the pot. */
export const pothos: Foliage = {
  label: 'Pothos et lianes',
  back: () => {
    const [l, r] = [artUrl('pothos-leaf-l'), artUrl('pothos-leaf-r')];
    return {
      defs: leafGradients('pothos-leaf'),
      body: MOUND.map(
        ([base, angle, length, gold]) =>
          stem(smooth([[512, 600], [(512 + base[0]) / 2, (600 + base[1]) / 2 + 10], base]), 10) +
          pothosLeaf(base, angle, length, angle < 0 ? l : r, gold, angle < 0 ? -0.06 : 0.06),
      ).join(''),
    };
  },
  front: () => {
    const paints: [string, string] = [artUrl('pothos-vine-l'), artUrl('pothos-vine-r')];
    return {
      defs: leafGradients('pothos-vine'),
      body:
        vine(
          [
            [400, 558],
            [314, 552],
            [266, 650],
            [290, 766],
          ],
          [0.18, 0.4, 0.62, 0.82, 1],
          paints,
          90,
        ) +
        vine(
          [
            [624, 558],
            [714, 552],
            [758, 634],
            [736, 718],
          ],
          [0.22, 0.48, 0.74, 1],
          paints,
          88,
        ),
    };
  },
};
