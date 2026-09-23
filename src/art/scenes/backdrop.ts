/**
 * What sits behind a scene: a soft blob of color and the shadows on the
 * ground, in a light and a dark version so the scene melts into the app's
 * background in both modes.
 */

import { artUrl, verticalGradient } from '../svg';
import type { Fragment } from '../types';

/** The frame of every scene, 4:3. */
export const SCENE_WIDTH = 800;
export const SCENE_HEIGHT = 600;
export const SCENE_VIEWBOX = `0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`;

/** Where things stand in a scene. */
export const GROUND = 505;

/** The mood of a backdrop: a green meadow, a lavender evening, a warm peach. */
export type Tone = 'meadow' | 'dusk' | 'peach';

type ToneColors = { top: string; bottom: string; shadow: string };

const TONES: Record<Tone, { light: ToneColors; dark: ToneColors }> = {
  meadow: {
    light: { top: '#E6F5E1', bottom: '#D3ECCC', shadow: '#BCDDB3' },
    dark: { top: '#1B2B1F', bottom: '#172519', shadow: '#0A110B' },
  },
  dusk: {
    light: { top: '#E9E7F7', bottom: '#DCDAF0', shadow: '#C6C3E2' },
    dark: { top: '#1E2335', bottom: '#191D2C', shadow: '#0B0D15' },
  },
  peach: {
    light: { top: '#FCEFE4', bottom: '#F8DFCD', shadow: '#EBC9B1' },
    dark: { top: '#2A2320', bottom: '#241D1A', shadow: '#0F0B0A' },
  },
};

/** Rounds to one decimal, for the markup. */
export const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A smooth closed blob around (cx, cy): one radius factor per point, evenly
 * spread around, joined by curves (Catmull-Rom as cubic Béziers).
 */
export function blobPath(cx: number, cy: number, rx: number, ry: number, factors: number[]): string {
  const n = factors.length;
  const points = factors.map((f, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f];
  });
  const at = (i: number) => points[(i + n) % n];
  let d = `M ${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return `${d} Z`;
}

/** The shape of each scene's blob, so they don't all look alike. */
export type BlobShape = number[];

/** The blob behind a scene. */
export function blob(tone: Tone, dark: boolean, shape: BlobShape): Fragment {
  const c = TONES[tone][dark ? 'dark' : 'light'];
  const id = `scene-backdrop-${tone}`;
  return {
    defs: verticalGradient(id, [
      [0, c.top],
      [1, c.bottom],
    ]),
    body: `<path d="${blobPath(400, 312, 300, 238, shape)}" fill="${artUrl(id)}"/>`,
  };
}

/** A soft shadow on the ground under something `width` wide, centered on x. */
export function groundShadow(tone: Tone, dark: boolean, x: number, width: number, y = GROUND): Fragment {
  const c = TONES[tone][dark ? 'dark' : 'light'];
  return {
    body: `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(width / 2)}" ry="${r1(Math.max(8, width * 0.07))}" fill="${c.shadow}" opacity="${dark ? 0.7 : 0.8}"/>`,
  };
}
