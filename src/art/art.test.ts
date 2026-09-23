import { describe, expect, it } from '@jest/globals';

import { normalizeOutfit, pepinSvg } from './pepin';
import { previews } from './preview';
import { DEFAULT_OUTFIT } from './types';

/** What <SvgXml> of react-native-svg draws the same on Android, iOS and the web. */
const ELEMENTS = new Set([
  'svg',
  'defs',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
]);

/** The tags of a document, checked to open and close in order. */
function tags(svg: string): string[] {
  const stack: string[] = [];
  const seen: string[] = [];
  for (const [, closing, name, , selfClosing] of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:\s[^>]*?)?)(\/?)>/g)) {
    seen.push(name);
    if (closing) {
      expect(stack.pop()).toBe(name);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  expect(stack).toEqual([]);
  return seen;
}

describe('drawings', () => {
  const all = previews();

  it.each(all.map((p) => [`${p.group}/${p.name}`, p.svg]))('%s is a clean SVG document', (_, svg) => {
    expect(svg.startsWith('<svg ')).toBe(true);
    for (const name of tags(svg)) expect(ELEMENTS).toContain(name);
    expect(svg).not.toMatch(/NaN|undefined|null|\[object/);
    expect(svg).not.toMatch(/\sclass=|\sstyle=|<style|<text|<filter|<mask/);
    // Every id is used once, and every reference points to one.
    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);
  });

  it('gives different drawings different ids', () => {
    const a = pepinSvg(DEFAULT_OUTFIT, { mood: 'happy' });
    const b = pepinSvg(DEFAULT_OUTFIT, { mood: 'sleepy' });
    const idsOf = (svg: string) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(idsOf(a).some((id) => idsOf(b).includes(id))).toBe(false);
  });
});

describe('normalizeOutfit', () => {
  it('fills in the defaults and drops what the app does not know', () => {
    expect(normalizeOutfit(null)).toEqual(DEFAULT_OUTFIT);
    expect(
      normalizeOutfit({ plant: 'baobab' as never, pot: 'gold', head: 'crown-of-thorns', eyes: null }),
    ).toEqual(DEFAULT_OUTFIT);
  });
});
