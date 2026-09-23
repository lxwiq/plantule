import { LEAF } from '../palette';
import { artUrl, lighten, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { fillHoled, fillPath, frame, heart, leafGradients, loop, outline, smooth, stem, vein } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/**
 * Half of a heart-shaped leaf, from the stalk's notch to the tip: `u` along
 * the midrib, `v` across it, in fractions of the leaf's length.
 */
const HALF: Pt[] = [
  [0.07, 0],
  [0.01, 0.07],
  [-0.05, 0.18],
  [-0.06, 0.3],
  [0.01, 0.41],
  [0.15, 0.48],
  [0.34, 0.5],
  [0.54, 0.45],
  [0.72, 0.34],
  [0.87, 0.19],
  [1, 0],
];

/** A smooth curve through the points, as a dense polyline walked by its length (0–1). */
function walk(points: Pt[]): { at: (s: number) => Pt; length: number } {
  const n = points.length;
  const slope = (i: number): Pt => {
    const [a, b] = [points[Math.max(0, i - 1)], points[Math.min(n - 1, i + 1)]];
    const k = i === 0 || i === n - 1 ? 1 : 0.5;
    return [(b[0] - a[0]) * k, (b[1] - a[1]) * k];
  };
  const dense: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, m0, m1] = [points[i], points[i + 1], slope(i), slope(i + 1)];
    for (let j = 0; j < 12; j++) {
      const t = j / 12;
      const h = [2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2];
      dense.push([0, 1].map((c) => h[0] * p0[c] + h[1] * m0[c] + h[2] * p1[c] + h[3] * m1[c]) as Pt);
    }
  }
  dense.push(points[n - 1]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const length = acc[acc.length - 1];
  const at = (s: number): Pt => {
    const target = Math.min(1, Math.max(0, s)) * length;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < target) i++;
    const k = (target - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
    const [a, b] = [dense[i - 1], dense[i]];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  return { at, length };
}

const HEART = walk(HALF);

/**
 * One half of a split leaf, from the notch to the tip: the margin cut by
 * slots that run in toward the midrib (`splits`: where they open along the
 * margin, 0–1), and small holes near the midrib between them.
 */
function splitHalf(splits: number[]): { points: Pt[]; holes: Pt[][] } {
  const mouth = 0.05 / HEART.length;
  const soft = 0.045 / HEART.length;
  const r = 0.03;
  const points: Pt[] = [];
  const holes: Pt[][] = [];
  let from = 0;
  const margin = (a: number, b: number) => {
    const steps = Math.max(1, Math.round((b - a) / 0.07));
    return Array.from({ length: steps + 1 }, (_, i) => HEART.at(a + ((b - a) * i) / steps));
  };
  const ends: Pt[] = [];
  for (const s of splits) {
    const p = HEART.at(s);
    // The slot runs in toward the midrib, a little back toward the stalk.
    const q: Pt = [p[0] - 0.07, 0.15];
    ends.push(q);
    const al = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const [ux, uy] = [(q[0] - p[0]) / al, (q[1] - p[1]) / al];
    const before = HEART.at(s - mouth);
    const side = (before[0] - p[0]) * -uy + (before[1] - p[1]) * ux > 0 ? 1 : -1;
    // A point `d` into the slot, `w` off its middle toward the stalk (k = 1) or the tip (k = -1).
    const at = (k: number, d: number, w: number): Pt => [p[0] + ux * d - uy * w * k * side, p[1] + uy * d + ux * w * k * side];
    const end = [45, 90, 135].map((deg): Pt => {
      const t = (deg * Math.PI) / 180;
      const [c, sn] = [r * Math.cos(t) * side, r * Math.sin(t)];
      return [q[0] - uy * c + ux * sn, q[1] + ux * c + uy * sn];
    });
    points.push(
      ...margin(from, s - mouth - soft),
      at(1, 0.015, 0.05),
      at(1, al * 0.5, 0.037),
      at(1, al, r),
      ...end,
      at(-1, al, r),
      at(-1, al * 0.5, 0.037),
      at(-1, 0.015, 0.05),
    );
    from = s + mouth + soft;
  }
  points.push(...margin(from, 1));
  // Holes in line with the slots' ends, closer to the midrib.
  for (let i = 0; i < ends.length - 1; i++) {
    const c: Pt = [(ends[i][0] + ends[i + 1][0]) / 2 + 0.02, 0.085];
    holes.push([
      [c[0] - 0.034, c[1] - 0.004],
      [c[0] - 0.004, c[1] - 0.02],
      [c[0] + 0.034, c[1] + 0.004],
      [c[0] + 0.004, c[1] + 0.02],
    ]);
  }
  return { points, holes };
}

const SPLIT_HALF = splitHalf([0.4, 0.56, 0.72]);

/** A monstera leaf: a big heart with splits and holes, the stalk's notch at `base`. */
function monsteraLeaf(base: Pt, angle: number, length: number, paint: string, bend: number): string {
  const f = frame(base, angle, bend, length);
  const right = SPLIT_HALF.points.map(([u, v]) => f(u * length, v * length));
  const left = SPLIT_HALF.points.map(([u, v]) => f(u * length, -v * length)).reverse();
  const holes = SPLIT_HALF.holes
    .flatMap((h) => [h, h.map(([u, v]): Pt => [u, -v])])
    .map((h) => ' ' + loop(h.map(([u, v]) => f(u * length, v * length))))
    .join('');
  const midrib = smooth([f(length * 0.08, 0), f(length * 0.45, 0), f(length * 0.84, 0)]);
  return fillHoled(outline(right, left) + holes, paint) + vein(midrib, 10);
}

/** A leaf on its stalk, growing from the soil at `from` through `via`. */
function leafOnStalk(from: Pt, via: Pt, base: Pt, angle: number, length: number, paint: string, bend: number): string {
  const tuck = frame(base, angle)(length * 0.12, 0);
  return stem(smooth([from, via, base, tuck]), 18) + monsteraLeaf(base, angle, length, paint, bend);
}

/** A young leaf, still whole, in a fresher green. */
function youngLeaf(from: Pt, base: Pt, angle: number, length: number): string {
  const f = frame(base, angle);
  return (
    stem(smooth([from, [(from[0] + base[0]) / 2 + 4, (from[1] + base[1]) / 2], base, f(length * 0.12, 0)]), 13) +
    fillPath(heart(base, angle, length, length * 0.86), artUrl('monstera-young')) +
    vein(smooth([f(length * 0.1, 0), f(length * 0.45, 0), f(length * 0.8, 0)]), 8)
  );
}

/** Monstera deliciosa: big split hearts on long stalks, and a young leaf. */
export const monstera: Foliage = {
  label: 'Monstera',
  back: () => ({
    defs:
      leafGradients('monstera-leaf') +
      linearGradient('monstera-young', [1, 0, 0, 1], [
        [0, lighten(LEAF.light, 0.12)],
        [1, LEAF.mid],
      ]),
    body:
      leafOnStalk([488, 600], [436, 518], [372, 456], -62, 225, artUrl('monstera-leaf-l'), -0.08) +
      leafOnStalk([536, 600], [592, 512], [644, 446], 60, 222, artUrl('monstera-leaf-r'), 0.08) +
      leafOnStalk([510, 600], [510, 500], [502, 410], -7, 240, artUrl('monstera-leaf-l'), -0.05) +
      youngLeaf([522, 600], [550, 506], 26, 106),
  }),
};
