/**
 * The shapes of Plantule's drawings. Everything in src/art is plain TypeScript
 * that builds SVG markup: no React, no React Native, so the same drawings serve
 * the app (through <SvgXml>), the preview script and the tests.
 */

/** A piece of drawing: SVG elements, and the gradients or clip paths they use. */
export type Fragment = {
  /** Elements for <defs> (gradients, clip paths). Ids go through `artId()`. */
  defs?: string;
  /** The visible elements, in drawing order. */
  body: string;
};

/**
 * The families of plants the app knows how to draw. Each has its own file in
 * src/art/plants; species map to one in src/art/species.ts.
 */
export const PLANT_KINDS = [
  'sprout',
  'monstera',
  'pothos',
  'elephant_ear',
  'snake',
  'zz',
  'ficus',
  'palm',
  'fern',
  'calathea',
  'dracaena',
  'spider',
  'colorful',
  'pilea',
  'cactus',
  'succulent',
  'aloe',
  'string_of_pearls',
  'orchid',
  'peace_lily',
  'flowers',
  'bromeliad',
  'herbs',
  'lavender',
  'tree',
  'veggie',
] as const;

export type PlantKind = (typeof PLANT_KINDS)[number];

/** What to draw for a plant: its family, and the color of its flowers or fruits when it has some. */
export type ArtSpec = {
  kind: PlantKind;
  /** Bloom or fruit color (hex), for the kinds that show some. */
  accent?: string;
};

export type FoliageOptions = {
  /** Bloom or fruit color (hex); each kind has its own default. */
  accent?: string;
};

/**
 * A plant family, drawn in the pot's coordinates (see src/art/pot.ts): stems
 * start from the soil behind the rim, around (512, 600).
 */
export type Foliage = {
  /** French name of the family, for lists and pickers. */
  label: string;
  /** Stems and leaves growing out of the pot, drawn behind it. */
  back: (options: FoliageOptions) => Fragment;
  /**
   * Leaves or vines hanging over the rim, drawn over the pot. They must keep
   * off the face (x 400–624, y 670–770).
   */
  front?: (options: FoliageOptions) => Fragment;
};

/** The pot's face. */
export const MOODS = ['happy', 'joy', 'sleepy', 'thirsty', 'worried', 'love'] as const;

export type Mood = (typeof MOODS)[number];

/** The slots of Pépin's wardrobe, besides the plant growing out of it and the pot color. */
export type WardrobeSlot = 'pattern' | 'head' | 'eyes' | 'neck' | 'held';

/**
 * What Pépin, the mascot, wears. Item ids are plain strings: an id the app no
 * longer knows (an item removed later, an old backup) is simply not drawn.
 */
export type Outfit = {
  /** What grows out of Pépin. */
  plant: PlantKind;
  /** Pot color id, see POT_COLORS. */
  pot: string;
  pattern: string | null;
  head: string | null;
  eyes: string | null;
  neck: string | null;
  held: string | null;
};

export const DEFAULT_OUTFIT: Outfit = {
  plant: 'sprout',
  pot: 'terracotta',
  pattern: null,
  head: null,
  eyes: null,
  neck: null,
  held: null,
};

/** A piece of Pépin's wardrobe. */
export type WardrobeItem = {
  id: string;
  slot: WardrobeSlot;
  /** French name, shown in the wardrobe. */
  label: string;
  /**
   * The item on Pépin, in the pot's coordinates. `back` goes behind the pot
   * (a hat's back brim, a mug's handle behind Pépin), `front` over it. A
   * pattern's `front` is clipped to the pot body.
   */
  draw: () => { back?: Fragment; front: Fragment };
};
