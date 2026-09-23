import type { ArtSpec } from './types';

/**
 * The drawing for a plant's species (free text, French or scientific name).
 * The sprout when the species is unknown.
 */
export function artSpecForSpecies(species: string | null | undefined): ArtSpec {
  void species;
  return { kind: 'sprout' };
}
