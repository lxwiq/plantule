/**
 * Every drawing, for the contact sheet of scripts/art-preview.mjs. Each part
 * of src/art lists its own.
 */

import { plantPreviews } from './plants/preview';
import { scenePreviews } from './scenes/preview';
import { wardrobePreviews } from './wardrobe/preview';

export type Preview = {
  /** "plants", "pepin", "scenes"… */
  group: string;
  name: string;
  svg: string;
};

export function previews(): Preview[] {
  return [...plantPreviews(), ...wardrobePreviews(), ...scenePreviews()];
}
