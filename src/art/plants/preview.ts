import { plantArtSvg } from '../plant-art';
import { MOODS, PLANT_KINDS } from '../types';
import type { Preview } from '../preview';

/** Every family with its default colors, then every face on the sprout. */
export function plantPreviews(): Preview[] {
  return [
    ...PLANT_KINDS.map((kind) => ({ group: 'plants', name: kind, svg: plantArtSvg({ kind }) })),
    ...MOODS.map((mood) => ({ group: 'moods', name: mood, svg: plantArtSvg({ kind: 'sprout' }, { mood }) })),
  ];
}
