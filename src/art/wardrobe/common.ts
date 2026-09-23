/**
 * Shapes and colors shared by the pieces of Pépin's wardrobe, in the pot's
 * coordinates (see src/art/pot.ts).
 */

import type { PotPalette } from '../palette';
import { mix } from '../svg';

/** Soft fabric and wool colors: a light and a shaded tone each. */
export const WOOL = {
  cream: { light: '#FFF6E8', shade: '#EBDCC4' },
  red: { light: '#E56B63', shade: '#C9504C' },
  pink: { light: '#F6AFC0', shade: '#E48AA0' },
  mustard: { light: '#F2C45A', shade: '#DBA23A' },
  sage: { light: '#A9C8A0', shade: '#86A87E' },
  blue: { light: '#9CC3EA', shade: '#739FCC' },
  navy: { light: '#4F6696', shade: '#34466B' },
  lavender: { light: '#C7B6EC', shade: '#A28FD0' },
} as const;

export const GOLD = { light: '#F8DA7A', shade: '#E2AD3C', shine: '#FFF3C4' } as const;

/** Rounds to one decimal, for coordinates computed in loops. */
export const r1 = (value: number) => Math.round(value * 10) / 10;

/** Relative luminance of a hex color, 0 (black) to 1 (white). */
export function luminance(color: string): number {
  const hex = color.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A pale pot, on which cream motifs would vanish. */
export const isPalePot = (pot: PotPalette) => luminance(pot.body) > 0.7;

function distance(a: string, b: string): number {
  const rgb = (c: string) => [0, 2, 4].map((i) => parseInt(c.replace('#', '').slice(i, i + 2), 16));
  const [pa, pb] = [rgb(a), rgb(b)];
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

type Wool = { light: string; shade: string };

/** The first of `choices` that stands out on the pot, e.g. a red scarf, or a blue one on a reddish pot. */
export function standOut(pot: PotPalette, choices: Wool[]): Wool {
  return choices.find((c) => distance(c.light, pot.body) > 60) ?? choices[choices.length - 1];
}

/**
 * Whether a motif of radius `r` at (x, y) keeps off the face: eyes, mouth
 * and cheeks stay clear of patterns.
 */
export function clearOfFace(x: number, y: number, r: number): boolean {
  const zones: [number, number, number, number][] = [
    [440, 672, 484, 728], // left eye
    [540, 672, 584, 728], // right eye
    [482, 722, 542, 778], // mouth
    [390, 712, 450, 748], // left cheek
    [574, 712, 634, 748], // right cheek
  ];
  const m = r + 6;
  return zones.every(([x1, y1, x2, y2]) => x < x1 - m || x > x2 + m || y < y1 - m || y > y2 + m);
}

/** A heart path centered on (x, y), about 2 × `size` wide. */
export function heartPath(x: number, y: number, size: number): string {
  const s = size / 20;
  const p = (dx: number, dy: number) => `${r1(x + dx * s)} ${r1(y + dy * s)}`;
  return (
    `M ${p(0, 14)} C ${p(-26, -2)} ${p(-20, -24)} ${p(-6, -22)} ` +
    `C ${p(-2, -21)} ${p(0, -17)} ${p(0, -13)} C ${p(0, -17)} ${p(2, -21)} ${p(6, -22)} ` +
    `C ${p(20, -24)} ${p(26, -2)} ${p(0, 14)} Z`
  );
}

/** The points of a five-pointed star centered on (x, y), for a <polygon>. */
export function starPoints(x: number, y: number, r: number, rotation = 0): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.48;
    const a = ((rotation - 90 + i * 36) * Math.PI) / 180;
    points.push(`${r1(x + radius * Math.cos(a))},${r1(y + radius * Math.sin(a))}`);
  }
  return points.join(' ');
}

/** A soft star: the polygon with round corners (a stroke of its own color). */
export function star(x: number, y: number, r: number, color: string, rotation = 0, opacity = 1): string {
  const o = opacity < 1 ? ` opacity="${opacity}"` : '';
  return `<polygon points="${starPoints(x, y, r, rotation)}" fill="${color}" stroke="${color}" stroke-width="${r1(r * 0.3)}" stroke-linejoin="round"${o}/>`;
}

/** A five-petal flower centered on (x, y). */
export function flower(x: number, y: number, r: number, petal: string, heart: string, rotation = 0): string {
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const a = ((rotation - 90 + i * 72) * Math.PI) / 180;
    petals += `<circle cx="${r1(x + r * 0.62 * Math.cos(a))}" cy="${r1(y + r * 0.62 * Math.sin(a))}" r="${r1(r * 0.52)}" fill="${petal}"/>`;
  }
  return petals + `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 0.36)}" fill="${heart}"/>`;
}

/** A small leaf from (x, y), pointing at `angle` degrees (0 is right). */
export function leaf(x: number, y: number, length: number, angle: number, color: string): string {
  const w = length * 0.42;
  return (
    `<path transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(angle)})" ` +
    `d="M 0 0 Q ${r1(length * 0.5)} ${r1(-w)} ${r1(length)} 0 Q ${r1(length * 0.5)} ${r1(w)} 0 0 Z" fill="${color}"/>`
  );
}

/**
 * A stubby arm in the pot's colors, coming out from behind the pot's side
 * (`side`) to a hand at (x, y). Returns the arm, for `back`, and the hand,
 * for `front`, drawn over what it holds.
 */
export function stubbyArm(pot: PotPalette, side: 'left' | 'right', x: number, y: number) {
  // The arm starts inside the body, which hides its root.
  const rootX = side === 'right' ? 630 : 394;
  const rootY = y + 22;
  const arm = mix(pot.body, pot.light, 0.5);
  return {
    arm: `<path d="M ${rootX} ${rootY} Q ${r1((rootX + x) / 2)} ${r1(rootY + 6)} ${x} ${y}" fill="none" stroke="${arm}" stroke-width="34" stroke-linecap="round"/>`,
    hand:
      `<circle cx="${x}" cy="${y}" r="21" fill="${pot.rim}"/>` +
      `<path d="M ${x - 10} ${y - 9} Q ${x - 2} ${y - 16} ${x + 7} ${y - 12}" fill="none" stroke="${pot.rimHighlight}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`,
  };
}
