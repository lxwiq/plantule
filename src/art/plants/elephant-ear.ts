import { LEAF } from '../palette';
import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { fillPath, frame, leafGradients, outline, smooth, stem, vein } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** Half of an arrow-shaped leaf, from the stalk's notch to the tip, in fractions of its length. */
const HALF: Pt[] = [
  [0.12, 0],
  [0.03, 0.07],
  [-0.08, 0.17],
  [-0.19, 0.27],
  [-0.12, 0.35],
  [0.04, 0.4],
  [0.26, 0.4],
  [0.5, 0.31],
  [0.75, 0.17],
  [1, 0],
];

/** Side veins of one half: where they leave the midrib and where they end. */
const VEINS: [Pt, Pt][] = [
  [[0.12, 0], [-0.1, 0.25]],
  [[0.2, 0], [0.3, 0.3]],
  [[0.38, 0], [0.5, 0.25]],
  [[0.56, 0], [0.66, 0.18]],
  [[0.72, 0], [0.8, 0.11]],
];

/** An elephant ear leaf, tip up, on a long stalk from the soil at `from`. */
function earLeaf(from: Pt, via: Pt, base: Pt, angle: number, length: number, paint: string, bend = 0): string {
  const f = frame(base, angle, bend, length);
  const at = ([u, v]: Pt, side = 1) => f(u * length, side * v * length);
  const right = HALF.map((p) => at(p));
  const left = HALF.map((p) => at(p, -1)).reverse();
  const veins = [1, -1]
    .flatMap((side) =>
      VEINS.map(([a, b]) => {
        const mid: Pt = [(a[0] + b[0]) / 2 + 0.02, (a[1] + b[1]) / 2 - 0.02];
        return vein(smooth([at(a, side), at(mid, side), at(b, side)]), 7, 0.8);
      }),
    )
    .join('');
  return (
    stem(smooth([from, via, base, f(length * 0.2, 0)]), 15) +
    fillPath(outline(right, left), paint) +
    veins +
    vein(smooth([f(length * 0.12, 0), f(length * 0.5, 0), f(length * 0.88, 0)]), 10, 0.85)
  );
}

/** Alocasia and other big leaves: arrows held high on long stalks, with bold pale veins. */
export const elephantEar: Foliage = {
  label: 'Grandes feuilles',
  back: () => ({
    defs: leafGradients('elephant-leaf', [LEAF.mid, LEAF.deep], [LEAF.mid, LEAF.deep]),
    body:
      earLeaf([494, 600], [452, 500], [380, 438], -40, 178, artUrl('elephant-leaf-l'), -0.05) +
      earLeaf([530, 600], [576, 510], [646, 450], 42, 172, artUrl('elephant-leaf-r'), 0.05) +
      earLeaf([512, 600], [520, 480], [514, 372], 3, 205, artUrl('elephant-leaf-l')),
  }),
};
