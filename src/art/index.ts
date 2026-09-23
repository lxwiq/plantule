/**
 * Plantule's drawings, in the logo's style: plants in their smiling pot,
 * Pépin the mascot and its wardrobe, and cozy scenes. Plain functions that
 * return SVG markup; the app shows them with src/components/art.tsx.
 */

export { BACKDROP, POT_COLORS } from './palette';
export { DEFAULT_MASCOT_NAME, normalizeOutfit, pepinFragment, pepinSvg } from './pepin';
export { FOLIAGE } from './plants';
export { plantArtFragment, plantArtSvg } from './plant-art';
export { ART_VIEWBOX } from './pot';
export { artSpecForSpecies } from './species';
export { svgDocument } from './svg';
export {
  DEFAULT_OUTFIT,
  MOODS,
  PLANT_KINDS,
  type ArtSpec,
  type Mood,
  type Outfit,
  type PlantKind,
  type WardrobeItem,
  type WardrobeSlot,
} from './types';
export { WARDROBE, wardrobeItem } from './wardrobe';
