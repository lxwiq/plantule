import { FOLIAGE } from './plants';
import { ART_VIEWBOX, faceFragment, potFragment } from './pot';
import { combine, svgDocument } from './svg';
import type { ArtSpec, Fragment, Mood } from './types';

/**
 * A plant of the given family in a terracotta pot. `mood` sets the pot's face;
 * null draws it without one.
 */
export function plantArtFragment(spec: ArtSpec, mood: Mood | null = 'happy'): Fragment {
  const foliage = FOLIAGE[spec.kind] ?? FOLIAGE.sprout;
  const options = { accent: spec.accent };
  return combine(
    foliage.back(options),
    potFragment('terracotta'),
    mood && faceFragment(mood),
    foliage.front?.(options),
  );
}

type PlantArtOptions = {
  mood?: Mood | null;
  /** A fill behind the plant; transparent by default. */
  background?: string;
};

/** The SVG document of a plant in its pot, framed by ART_VIEWBOX. */
export function plantArtSvg(spec: ArtSpec, { mood = 'happy', background }: PlantArtOptions = {}): string {
  return svgDocument(plantArtFragment(spec, mood), { viewBox: ART_VIEWBOX, background });
}
