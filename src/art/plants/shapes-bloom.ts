/**
 * Shapes shared by the flowering, fruiting and fleshy families (cacti,
 * succulents, orchids, flowers, herbs, little trees…): leaves computed from a
 * base and a tip, tapered ribbons, round blooms and fruits, and the shades of
 * an accent color. Every number goes out rounded to one decimal.
 */

import { artId, lighten, mix } from '../svg';

export type Point = readonly [number, number];

/** The powdery blue-green of succulents and aloes, from lit to shaded. */
export const SAGE = {
  light: '#A6DCCB',
  mid: '#7DBFAA',
  dark: '#52967F',
  deep: '#3D7866',
  vein: '#D8F3E8',
} as const;

/** A number for the markup, rounded to one decimal. */
export function num(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** "x y", rounded. */
export function pt([x, y]: Point): string {
  return `${num(x)} ${num(y)}`;
}

/** The point `length` away from `origin`, `angle` degrees clockwise from straight up. */
export function polar([x, y]: Point, angle: number, length: number): Point {
  const a = (angle * Math.PI) / 180;
  return [x + Math.sin(a) * length, y - Math.cos(a) * length];
}

type Axis = { base: Point; length: number; along: Point; side: Point };

/** The frame of a leaf: its length, a unit vector towards the tip and one to its side. */
function axis(base: Point, tip: Point): Axis {
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const length = Math.hypot(dx, dy) || 1;
  const along: Point = [dx / length, dy / length];
  return { base, length, along, side: [-along[1], along[0]] };
}

/** The point `t` of the way along the axis, `offset` to its side. */
function at({ base, length, along, side }: Axis, t: number, offset: number): Point {
  return [base[0] + along[0] * length * t + side[0] * offset, base[1] + along[1] * length * t + side[1] * offset];
}

export type LeafShape = {
  /** Sideways curve of the midrib, in drawing units (negative bends the other way). */
  bend?: number;
  /** 0 for a pointed tip, 1 for a round one. */
  round?: number;
  /** 0 for a narrow base, 1 for a wide one. */
  full?: number;
};

/**
 * The control points of each edge of a leaf: `right` is on the right hand
 * going from the base to the tip, from base to tip; `left` from tip to base.
 */
function leafControls(a: Axis, width: number, { bend = 0, round = 0.3, full = 0.3 }: LeafShape) {
  const half = (width / 2) * (4 / 3);
  const t1 = 0.18 - full * 0.18;
  const t2 = 0.68 + round * 0.3;
  return {
    right: [at(a, t1, bend + half), at(a, t2, bend + half)] as const,
    left: [at(a, t2, bend - half), at(a, t1, bend - half)] as const,
  };
}

/** An almond leaf from `base` to `tip`, `width` across at its widest. */
export function leafPath(base: Point, tip: Point, width: number, shape: LeafShape = {}): string {
  const a = axis(base, tip);
  const { right, left } = leafControls(a, width, shape);
  return `M ${pt(base)} C ${pt(right[0])} ${pt(right[1])} ${pt(tip)} C ${pt(left[0])} ${pt(left[1])} ${pt(base)} Z`;
}

/**
 * One half of a leaf drawn with `leafPath`, between an edge and the midrib:
 * laid over the leaf to shade it. `side` 1 is the right-hand half going from
 * the base to the tip, -1 the left-hand one.
 */
export function halfLeafPath(base: Point, tip: Point, width: number, shape: LeafShape = {}, side: 1 | -1 = 1): string {
  const a = axis(base, tip);
  const { right, left } = leafControls(a, width, shape);
  const mid = at(a, 0.5, (shape.bend ?? 0) * 1.5);
  if (side === 1) return `M ${pt(base)} C ${pt(right[0])} ${pt(right[1])} ${pt(tip)} Q ${pt(mid)} ${pt(base)} Z`;
  return `M ${pt(tip)} C ${pt(left[0])} ${pt(left[1])} ${pt(base)} Q ${pt(mid)} ${pt(tip)} Z`;
}

/** The midrib of a leaf drawn with `leafPath`, from `from` to `to` of its length. */
export function midribPath(base: Point, tip: Point, bend = 0, from = 0.12, to = 0.78): string {
  const a = axis(base, tip);
  const middle = (from + to) / 2;
  // A quadratic's middle sits halfway to its control point, the leaf's midrib at 3/4 of the bend.
  return `M ${pt(at(a, from, bend * 0.6))} Q ${pt(at(a, middle, bend * 1.5))} ${pt(at(a, to, bend * 0.6))}`;
}

/** A point of a cubic Bézier curve. */
export function cubicPoint([p0, p1, p2, p3]: readonly [Point, Point, Point, Point], t: number): Point {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    w[0] * p0[0] + w[1] * p1[0] + w[2] * p2[0] + w[3] * p3[0],
    w[0] * p0[1] + w[1] * p1[1] + w[2] * p2[1] + w[3] * p3[1],
  ];
}

/** Smooth cubic segments through `points` (Catmull-Rom), for after a "M" on the first one. */
export function through(points: readonly Point[]): string {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

/** A cubic Bézier curve, from its start to its end. */
export type Curve = readonly [Point, Point, Point, Point];

/** The point `t` along a curve, moved `offset` to its right-hand side (negative: to its left). */
export function besideCurve(c: Curve, t: number, offset = 0): Point {
  const p = cubicPoint(c, t);
  const q = cubicPoint(c, Math.min(t + 0.01, 1));
  const o = cubicPoint(c, Math.max(t - 0.01, 0));
  const len = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1;
  return [p[0] - ((q[1] - o[1]) / len) * offset, p[1] + ((q[0] - o[0]) / len) * offset];
}

/** The two edges of a ribbon, from its base to its tip. */
function ribbonEdges(c: Curve, width: (t: number) => number, steps: number) {
  const right: Point[] = [];
  const left: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    right.push(besideCurve(c, t, width(t) / 2));
    left.push(besideCurve(c, t, -width(t) / 2));
  }
  return { right, left };
}

/**
 * A strap along a curve from its base to its tip, `width(t)` across at each
 * point: strappy leaves, blades, petals.
 */
export function ribbonPath(c: Curve, width: (t: number) => number, steps = 10): string {
  const { right, left } = ribbonEdges(c, width, steps);
  return `M ${pt(right[0])}${through(right)}${through([...left].reverse())} Z`;
}

/** One half of a ribbon, between an edge and its middle: 1 its right-hand half, -1 its left-hand one. */
export function halfRibbonPath(c: Curve, width: (t: number) => number, side: 1 | -1, steps = 10): string {
  const { right, left } = ribbonEdges(c, width, steps);
  const edge = side === 1 ? right : left;
  const middle: Point[] = [];
  for (let i = steps; i >= 0; i--) middle.push(cubicPoint(c, i / steps));
  return `M ${pt(edge[0])}${through(edge)}${through(middle)} Z`;
}

/** A tapering width for `ribbonPath`: `base` wide at the start, pointed at the tip. */
export function taper(base: number, bluntness = 0.5): (t: number) => number {
  return (t) => base * Math.pow(1 - t, bluntness) * (1 + 0.15 * Math.sin(Math.PI * t));
}

type Stop = readonly [offset: number, color: string, opacity?: number];

/**
 * A <linearGradient> in drawing units, from `from` to `to`: for a shading that
 * follows a leaf rather than its bounding box. Don't reuse it across shapes
 * that are moved with a transform relative to each other.
 */
export function lineGradient(id: string, from: Point, to: Point, stops: readonly Stop[]): string {
  const s = stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`)
    .join('');
  return (
    `<linearGradient id="${artId(id)}" gradientUnits="userSpaceOnUse" ` +
    `x1="${num(from[0])}" y1="${num(from[1])}" x2="${num(to[0])}" y2="${num(to[1])}">${s}</linearGradient>`
  );
}

/** The opacity attribute, when there is one. */
const alpha = (opacity?: number) => (opacity === undefined ? '' : ` opacity="${opacity}"`);

/** A filled path. */
export function fill(d: string, paint: string, opacity?: number): string {
  return `<path d="${d}" fill="${paint}"${alpha(opacity)}/>`;
}

/** A stroked path with round ends. */
export function line(d: string, color: string, width: number, opacity?: number): string {
  return (
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${num(width)}" ` +
    `stroke-linecap="round" stroke-linejoin="round"${alpha(opacity)}/>`
  );
}

/** A circle. */
export function dot([x, y]: Point, r: number, paint: string, opacity?: number): string {
  return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${paint}"${alpha(opacity)}/>`;
}

/** An ellipse, turned by `angle` degrees. */
export function oval([x, y]: Point, rx: number, ry: number, paint: string, angle = 0, opacity?: number): string {
  const turn = angle ? ` transform="rotate(${num(angle)} ${num(x)} ${num(y)})"` : '';
  return `<ellipse cx="${num(x)}" cy="${num(y)}" rx="${num(rx)}" ry="${num(ry)}" fill="${paint}"${turn}${alpha(opacity)}/>`;
}

/** The shades of a bloom or fruit color, from its highlight to its shadow. */
export type Shades = { light: string; base: string; shade: string; deep: string };

/** Shades of an accent color. The shadows lean warm, like the rest of the drawings. */
export function shades(accent: string): Shades {
  return {
    light: lighten(accent, 0.4),
    base: accent,
    shade: mix(accent, '#7A3A3A', 0.2),
    deep: mix(accent, '#5A2A2A', 0.4),
  };
}

/** The heart of a bloom of that color: golden, or orange in a yellow flower. */
export function bloomHeart(accent: string): string {
  return isYellowish(accent) ? '#E8893A' : '#FFD36E';
}

/** A safe id part for a color: "#F4A6C0" gives "f4a6c0". */
export function colorKey(color: string): string {
  return color.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
}

/** Whether a color is a yellow or a golden orange, where a golden heart wouldn't show. */
function isYellowish(color: string): boolean {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return r > 200 && g > 150 && b < 150 && g > b + 60;
}

/**
 * A round, cheerful flower: `petals` round petals around a heart. `petal` is
 * the paint of the petals (a gradient in the petal's box shades each one).
 */
export function bloom(
  center: Point,
  radius: number,
  petal: string,
  heart: string,
  { petals = 5, turn = 0, heartSize = 0.34 }: { petals?: number; turn?: number; heartSize?: number } = {},
): string {
  let body = '';
  for (let i = 0; i < petals; i++) {
    const p = polar(center, turn + (360 / petals) * i, radius * 0.52);
    body += dot(p, radius * 0.5, petal);
  }
  body += dot(center, radius * heartSize, heart);
  body += dot([center[0] - radius * 0.1, center[1] - radius * 0.1], radius * heartSize * 0.35, '#FFFFFF', 0.45);
  return body;
}

/** A round fruit or berry, with a soft highlight. `paint` shades it (a gradient in its box). */
export function fruit(center: Point, radius: number, paint: string): string {
  return (
    dot(center, radius, paint) +
    oval([center[0] - radius * 0.35, center[1] - radius * 0.38], radius * 0.28, radius * 0.18, '#FFFFFF', -35, 0.55)
  );
}
