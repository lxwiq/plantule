import type { WardrobeItem, WardrobeSlot } from '../types';

import { EYES } from './eyes';
import { HATS } from './head';
import { HELD } from './held';
import { NECK } from './neck';
import { PATTERNS } from './patterns';

/** Every piece of Pépin's wardrobe, in the order the wardrobe shows them. */
export const WARDROBE: WardrobeItem[] = [...PATTERNS, ...HATS, ...EYES, ...NECK, ...HELD];

const byId = new Map(WARDROBE.map((item) => [item.id, item]));

/** The item with this id, if it exists and goes in this slot. */
export function wardrobeItem(id: string | null | undefined, slot: WardrobeSlot): WardrobeItem | undefined {
  if (!id) return undefined;
  const item = byId.get(id);
  return item?.slot === slot ? item : undefined;
}

/** The items of a slot, in the wardrobe's order. */
export function wardrobeSlot(slot: WardrobeSlot): WardrobeItem[] {
  return WARDROBE.filter((item) => item.slot === slot);
}
