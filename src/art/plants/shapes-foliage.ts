/**
 * Shared shapes for the foliage families: points in a leaf's own frame, smooth
 * outlines through points, leaves, straps along a curve, and the paints of
 * the logo's leaves. Everything returns SVG path data or markup.
 */

import { LEAF } from '../palette';
import { linearGradient } from '../svg';

/** A point, in the pot's coordinates. */
export type Pt = [number, number];

/** Numbers in the markup keep one decimal at most. */
export const num = (n: number) => String(Math.round(n * 10) / 10);

export const pt = ([x, y]: Pt) => `${num(x)} ${num(y)}`;

/**
 * A point in a leaf's own frame: `u` along its axis, `v` across it (to the
 * right when the axis points up).
 */
export type Frame = (u: number, v: number) => Pt;

/**
 * The frame of a leaf starting at `origin`, its axis at `angle` degrees
 * (0 points up, 90 to the right). `bend` curves the axis to the right (or
 * left when negative): the tip, at `u = length`, moves by `bend × length`.
 */
export function frame([x, y]: Pt, angle: number, bend = 0, length = 1): Frame {
  const a = (angle * Math.PI) / 180;
  const [dx, dy, nx, ny] = [Math.sin(a), -Math.cos(a), Math.cos(a), Math.sin(a)];
  return (u, v) => {
    const w = v + bend * length * (u / length) ** 2;
    return [x + u * dx + w * nx, y + u * dy + w * ny];
  };
}

/** The point `dist` away from `origin` in the direction `angle` (0 up, 90 right). */
export const polar = (origin: Pt, angle: number, dist: number): Pt => frame(origin, angle)(dist, 0);

const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];

/** Bézier segments through the points (Catmull–Rom), without the starting "M". */
function through(points: Pt[], closed: boolean): string {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n];
  const slope = (i: number): Pt => {
    if (!closed && i === 0) return sub(points[1], points[0]);
    if (!closed && i === n - 1) return sub(points[n - 1], points[n - 2]);
    return sub(at(i + 1), at(i - 1)).map((c) => c / 2) as Pt;
  };
  let d = '';
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    d += ` C ${pt(add(at(i), slope(i), 1 / 3))} ${pt(add(at(i + 1), slope((i + 1) % n), -1 / 3))} ${pt(at(i + 1))}`;
  }
  return d;
}

/** An open smooth line through the points, for stems and veins. */
export function smooth(points: Pt[]): string {
  return `M ${pt(points[0])}${through(points, false)}`;
}

/** A closed smooth shape through the points, without corners. */
export function loop(points: Pt[]): string {
  return `M ${pt(points[0])}${through(points, true)} Z`;
}

/**
 * A closed shape made of smooth runs that meet at corners (a leaf's tip, the
 * mouth of a split): each run starts where the previous one ends.
 */
export function outline(...runs: Pt[][]): string {
  return `M ${pt(runs[0][0])}${runs.map((r) => through(r, false)).join('')} Z`;
}

/** An ellipse as path data, its `rx` axis turned by `angle` degrees. */
export function ellipse([cx, cy]: Pt, rx: number, ry: number, angle = 0): string {
  const a = (angle * Math.PI) / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const p = (u: number, v: number) => pt([cx + u * c - v * s, cy + u * s + v * c]);
  const k = 0.5523;
  return (
    `M ${p(rx, 0)} C ${p(rx, k * ry)} ${p(k * rx, ry)} ${p(0, ry)}` +
    ` C ${p(-k * rx, ry)} ${p(-rx, k * ry)} ${p(-rx, 0)}` +
    ` C ${p(-rx, -k * ry)} ${p(-k * rx, -ry)} ${p(0, -ry)}` +
    ` C ${p(k * rx, -ry)} ${p(rx, -k * ry)} ${p(rx, 0)} Z`
  );
}

/** The point at `t` (0–1) on a Bézier curve of any degree. */
export function bezierAt(ps: Pt[], t: number): Pt {
  let pts = ps;
  while (pts.length > 1) pts = pts.slice(1).map((p, i) => add(pts[i], sub(p, pts[i]), t));
  return pts[0];
}

/** The control points of the part of a Bézier curve from its start to `t`. */
export function bezierUntil(ps: Pt[], t: number): Pt[] {
  const first: Pt[] = [ps[0]];
  let pts = ps;
  while (pts.length > 1) {
    pts = pts.slice(1).map((p, i) => add(pts[i], sub(p, pts[i]), t));
    first.push(pts[0]);
  }
  return first;
}

/** Path data of a quadratic or cubic Bézier curve from its control points. */
export function curve(ps: Pt[]): string {
  return `M ${pt(ps[0])} ${ps.length === 3 ? 'Q' : 'C'} ${ps.slice(1).map(pt).join(' ')}`;
}

/** The unit direction of a Bézier curve at `t`. */
export function bezierDir(ps: Pt[], t: number): Pt {
  const e = 0.001;
  const [a, b] = [bezierAt(ps, Math.max(0, t - e)), bezierAt(ps, Math.min(1, t + e))];
  const [dx, dy] = sub(b, a);
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/** The angle (0 up, 90 right) of a Bézier curve at `t`, in degrees. */
export function bezierAngle(ps: Pt[], t: number): number {
  const [dx, dy] = bezierDir(ps, t);
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

/**
 * A long leaf along a curved spine (Bézier control points), pointed at the
 * tip: `halfWidth(s)` gives its half width along the spine, s from 0 to 1.
 */
export function ribbon(spine: Pt[], halfWidth: (s: number) => number): string {
  const right: Pt[] = [];
  const left: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const s = i / 8;
    const p = bezierAt(spine, s);
    const [tx, ty] = bezierDir(spine, s);
    right.push(add(p, [-ty, tx], halfWidth(s)));
    left.push(add(p, [-ty, tx], -halfWidth(s)));
  }
  const tip = bezierAt(spine, 1);
  const runs = [[...right, tip], [tip, ...left.slice().reverse()]];
  if (halfWidth(0) > 0.5) runs.push([left[0], right[0]]);
  return outline(...runs);
}

/**
 * The half width of a leaf pointed at both ends, widest (`max`) at `widest`
 * along it (0–1). `base` keeps some width at the start, for leaves that grow
 * from a stem hidden behind the pot.
 */
export function lance(max: number, widest = 0.4, base = 0): (s: number) => number {
  const k = Math.log(0.5) / Math.log(widest);
  return (s) => Math.max(base * (1 - s) ** 2, max * Math.sin(Math.PI * s ** k));
}

type LeafOptions = {
  /** Curves the leaf sideways, see `frame`. */
  bend?: number;
  /** 0–1: fills the tip out. */
  round?: number;
  /** Width along the leaf, at 18, 45, 74 and 93 % of its length, as fractions of `width`. */
  profile?: [number, number, number, number];
};

/**
 * A simple leaf from its base to its tip, pointed at both ends like the
 * logo's: `width` is its full width.
 */
export function leaf(base: Pt, angle: number, length: number, width: number, { bend = 0, round = 0, profile }: LeafOptions = {}): string {
  const f = frame(base, angle, bend, length);
  const h = width / 2;
  const w = profile ?? [0.72, 1, 0.78 + round * 0.18, 0.34 + round * 0.3];
  const side = (k: number) => [0.18, 0.45, 0.74, 0.93].map((u, i) => f(length * u, k * h * w[i]));
  const tip = f(length, 0);
  return outline([f(0, 0), ...side(1), tip], [tip, ...side(-1).reverse(), f(0, 0)]);
}

/**
 * A small leaf drawn with one curve per side, lighter than `leaf` for the
 * many leaflets of a frond: `round` (0–1) fills the tip out.
 */
export function lens(base: Pt, angle: number, length: number, width: number, round = 0): string {
  const f = frame(base, angle);
  const h = width / 2;
  const [u1, v1, u2, v2] = [length * 0.1, h * 1.3, length * (0.6 + round * 0.3), h * (1.05 + round * 0.3)];
  return `M ${pt(base)} C ${pt(f(u1, v1))} ${pt(f(u2, v2))} ${pt(f(length, 0))} C ${pt(f(u2, -v2))} ${pt(f(u1, -v1))} ${pt(base)} Z`;
}

type LeafletOptions = {
  /** Leaflets on each side. */
  count: number;
  /** Where they start and end along the stem, 0–1. */
  from?: number;
  to?: number;
  /** Their length at `t` along the stem. */
  length: (t: number) => number;
  /** Their width, as a fraction of their length. */
  width?: number;
  /** Their angle away from the stem, in degrees. */
  spread?: number;
  /** 0–1: how much they hang down, pulled by their weight. */
  droop?: number;
  round?: number;
};

/** Leaflets on both sides of a stem (Bézier control points), as path data. */
export function leaflets(
  spine: Pt[],
  { count, from = 0.1, to = 0.95, length, width = 0.3, spread = 60, droop = 0, round = 0 }: LeafletOptions,
): string {
  const shapes: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = from + ((to - from) * i) / Math.max(1, count - 1);
    const base = bezierAt(spine, t);
    const along = bezierAngle(spine, t);
    for (const side of [-1, 1]) {
      const angle = along + side * spread;
      const down = ((180 - angle + 540) % 360) - 180;
      const l = length(t);
      shapes.push(lens(base, angle + droop * down, l, l * width, round));
    }
  }
  return shapes.join(' ');
}

/**
 * Half of a heart-shaped leaf, from the stalk's notch to the tip, `u` along
 * the midrib, `v` across it, in fractions of its length (a leaf as wide as long).
 */
const HEART_HALF: Pt[] = [
  [0.07, 0],
  [0.01, 0.09],
  [-0.03, 0.22],
  [0.03, 0.34],
  [0.17, 0.43],
  [0.38, 0.45],
  [0.6, 0.36],
  [0.8, 0.2],
  [1, 0],
];

/**
 * A heart-shaped leaf, the stalk's notch near `base` and the lobes around
 * it: `width` is its full width.
 */
export function heart(base: Pt, angle: number, length: number, width: number, { bend = 0 } = {}): string {
  const f = frame(base, angle, bend, length);
  const k = width / length / 0.9;
  const right = HEART_HALF.map(([u, v]) => f(u * length, v * k * length));
  const left = HEART_HALF.map(([u, v]) => f(u * length, -v * k * length)).reverse();
  return outline(right, left);
}

/** A filled path. */
export function fillPath(d: string, paint: string, opacity?: number): string {
  return `<path d="${d}" fill="${paint}"${opacity === undefined ? '' : ` opacity="${opacity}"`}/>`;
}

/** A path with holes (every subpath after the first one is cut out). */
export function fillHoled(d: string, paint: string): string {
  return `<path d="${d}" fill="${paint}" fill-rule="evenodd"/>`;
}

/** A stroked line with round ends. */
export function strokePath(d: string, color: string, width: number, opacity?: number): string {
  return (
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"` +
    `${opacity === undefined ? '' : ` opacity="${opacity}"`}/>`
  );
}

/** A leaf's pale vein, as in the logo. */
export function vein(d: string, width = 9, opacity = 0.75): string {
  return strokePath(d, LEAF.vein, width, opacity);
}

/** A stem in the logo's dark green. */
export function stem(d: string, width: number, color: string = LEAF.stem): string {
  return strokePath(d, color, width);
}

/**
 * The two gradients of the logo's leaves: `<name>-l` for leaves leaning left
 * (light top-left to dark bottom-right), `<name>-r` for leaves leaning right.
 */
export function leafGradients(name: string, left: [string, string] = [LEAF.light, LEAF.dark], right: [string, string] = [LEAF.mid, LEAF.deep]): string {
  return (
    linearGradient(`${name}-l`, [0, 0, 1, 1], [
      [0, left[0]],
      [1, left[1]],
    ]) +
    linearGradient(`${name}-r`, [1, 0, 0, 1], [
      [0, right[0]],
      [1, right[1]],
    ])
  );
}
