import { describe, expect, it } from '@jest/globals';

import { POT_COLORS } from '../palette';
import { normalizeOutfit, pepinSvg } from '../pepin';
import { MOODS, type WardrobeSlot } from '../types';

import { WARDROBE, wardrobeItem, wardrobeSlot } from '.';

const SLOTS: WardrobeSlot[] = ['pattern', 'head', 'eyes', 'neck', 'held'];

describe('the wardrobe', () => {
  it('has a handful of pieces in every slot, each with its own id and a French label', () => {
    for (const slot of SLOTS) expect(wardrobeSlot(slot).length).toBeGreaterThanOrEqual(5);
    const ids = WARDROBE.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of WARDROBE) expect(item.label.trim()).not.toBe('');
  });

  it('finds an item only in its own slot', () => {
    expect(wardrobeItem('hat-beanie', 'head')?.label).toBe('Bonnet à pompon');
    expect(wardrobeItem('hat-beanie', 'neck')).toBeUndefined();
    expect(normalizeOutfit({ head: 'neck-scarf' }).head).toBeNull();
  });

  it('draws every piece on every pot, with every face', () => {
    for (const pot of Object.keys(POT_COLORS)) {
      for (const item of WARDROBE) {
        const svg = pepinSvg({ pot, [item.slot]: item.id });
        expect(svg).not.toMatch(/NaN|undefined|null|\[object/);
        const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
        expect(new Set(ids).size).toBe(ids.length);
        for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);
      }
    }
    const everything = Object.fromEntries(SLOTS.map((slot) => [slot, wardrobeSlot(slot)[0].id]));
    for (const mood of MOODS) expect(pepinSvg({ ...everything, pot: 'midnight' }, { mood })).toMatch(/^<svg /);
  });
});
