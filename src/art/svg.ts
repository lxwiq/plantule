import type { Fragment } from './types';

/**
 * Marker in front of every id (gradient, clip path) of a drawing. `svgDocument`
 * replaces it with a prefix computed from the drawing itself, so two different
 * drawings on the same web page never share an id, while identical ones may.
 */
const ID_MARK = '__art__';

/** An id for `id="…"` in a fragment's defs. Prefix names with your part: "monstera-leaf". */
export function artId(name: string): string {
  return `${ID_MARK}${name}`;
}

/** A reference to an id, for `fill="…"`, `stroke="…"` or `clip-path="…"`. */
export function artUrl(name: string): string {
  return `url(#${ID_MARK}${name})`;
}

/** Joins fragments, in drawing order. Missing ones are skipped. */
export function combine(...fragments: (Fragment | null | undefined | false)[]): Fragment {
  const parts = fragments.filter((f): f is Fragment => !!f);
  return {
    defs: parts.map((f) => f.defs ?? '').join(''),
    body: parts.map((f) => f.body).join(''),
  };
}

/** A fragment drawn with a transform, e.g. `translate(20 0) scale(0.8)`. */
export function transformed(fragment: Fragment, transform: string): Fragment {
  return { defs: fragment.defs, body: `<g transform="${transform}">${fragment.body}</g>` };
}

/** djb2, as a short base-36 string. */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

type DocumentOptions = {
  /** The part of the drawing to show, "minX minY width height". */
  viewBox: string;
  /** A fill behind everything, when the drawing is not meant to be transparent. */
  background?: string;
};

/** A complete SVG document from a fragment, ready for <SvgXml> or a file. */
export function svgDocument(fragment: Fragment, { viewBox, background }: DocumentOptions): string {
  const [x, y, w, h] = viewBox.split(/\s+/);
  const bg = background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` : '';
  const defs = fragment.defs ? `<defs>${fragment.defs}</defs>` : '';
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${defs}${bg}${fragment.body}</svg>`;
  const prefix = `a${hash(markup)}-`;
  return markup.split(ID_MARK).join(prefix);
}

/** A vertical gradient from top to bottom, as a <linearGradient>. */
export function verticalGradient(id: string, stops: [offset: number, color: string][]): string {
  return linearGradient(id, [0, 0, 0, 1], stops);
}

/** A <linearGradient> in the shape's own box: x1 y1 x2 y2 between 0 and 1. */
export function linearGradient(
  id: string,
  [x1, y1, x2, y2]: [number, number, number, number],
  stops: [offset: number, color: string][],
): string {
  const s = stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${artId(id)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`;
}

/** Mixes two hex colors: 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, amount: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** A darker shade of a hex color, `amount` between 0 and 1. */
export function darken(color: string, amount: number): string {
  return mix(color, '#000000', amount);
}

/** A lighter tint of a hex color, `amount` between 0 and 1. */
export function lighten(color: string, amount: number): string {
  return mix(color, '#FFFFFF', amount);
}

function parseHex(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}
