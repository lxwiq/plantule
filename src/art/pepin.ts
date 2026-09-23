/**
 * Pépin, the mascot: the logo's pot, dressed with the outfit chosen in its
 * wardrobe. Same coordinates and frame as the plants (see src/art/pot.ts).
 */

import { POT_COLORS, potPalette } from './palette';
import { FOLIAGE } from './plants';
import { ART_VIEWBOX, faceFragment, potFragment } from './pot';
import { combine, svgDocument } from './svg';
import { DEFAULT_OUTFIT, type Fragment, type Mood, type Outfit } from './types';
import { wardrobeItem } from './wardrobe';

/** The mascot's name until the user gives it another one. */
export const DEFAULT_MASCOT_NAME = 'Pépin';

/** A stored outfit, completed with the defaults and cleared of what the app doesn't know. */
export function normalizeOutfit(outfit: Partial<Outfit> | null | undefined): Outfit {
  const o = { ...DEFAULT_OUTFIT, ...outfit };
  return {
    plant: o.plant in FOLIAGE ? o.plant : DEFAULT_OUTFIT.plant,
    pot: o.pot in POT_COLORS ? o.pot : DEFAULT_OUTFIT.pot,
    pattern: wardrobeItem(o.pattern, 'pattern') ? o.pattern : null,
    head: wardrobeItem(o.head, 'head') ? o.head : null,
    eyes: wardrobeItem(o.eyes, 'eyes') ? o.eyes : null,
    neck: wardrobeItem(o.neck, 'neck') ? o.neck : null,
    held: wardrobeItem(o.held, 'held') ? o.held : null,
  };
}

/**
 * Pépin wearing its outfit, with the face of a mood. From back to front: the
 * plant, what comes out from behind the pot (arms), the pot and its pattern,
 * the neck (under the face, so worried eyebrows stay visible), the face, the
 * leaves hanging over the rim, then glasses, hat and what Pépin holds.
 */
export function pepinFragment(outfit: Partial<Outfit> | null | undefined, mood: Mood = 'happy'): Fragment {
  const o = normalizeOutfit(outfit);
  const plant = FOLIAGE[o.plant];
  const context = { potId: o.pot, pot: potPalette(o.pot) };
  const pattern = wardrobeItem(o.pattern, 'pattern')?.draw(context);
  const head = wardrobeItem(o.head, 'head')?.draw(context);
  const eyes = wardrobeItem(o.eyes, 'eyes')?.draw(context);
  const neck = wardrobeItem(o.neck, 'neck')?.draw(context);
  const held = wardrobeItem(o.held, 'held')?.draw(context);
  return combine(
    plant.back({}),
    held?.back,
    head?.back,
    neck?.back,
    eyes?.back,
    potFragment(o.pot, pattern?.front),
    neck?.front,
    faceFragment(mood, o.pot),
    plant.front?.({}),
    eyes?.front,
    head?.front,
    held?.front,
  );
}

type PepinOptions = {
  mood?: Mood;
  /** A fill behind Pépin; transparent by default. */
  background?: string;
};

/** The SVG document of Pépin, framed like the plants. */
export function pepinSvg(outfit: Partial<Outfit> | null | undefined, { mood = 'happy', background }: PepinOptions = {}): string {
  return svgDocument(pepinFragment(outfit, mood), { viewBox: ART_VIEWBOX, background });
}
