import type { WardrobeItem, WardrobeSlot } from '../types';

/** Every piece of Pépin's wardrobe, in the order the wardrobe shows them. */
export const WARDROBE: WardrobeItem[] = [];

const byId = new Map(WARDROBE.map((item) => [item.id, item]));

/** The item with this id, if it exists and goes in this slot. */
export function wardrobeItem(id: string | null | undefined, slot: WardrobeSlot): WardrobeItem | undefined {
  if (!id) return undefined;
  const item = byId.get(id);
  return item?.slot === slot ? item : undefined;
}
