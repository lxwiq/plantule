import { plantArtSvg } from '../plant-art';
import { MOODS, PLANT_KINDS, type ArtSpec } from '../types';
import type { Preview } from '../preview';

/** Families drawn again with other bloom or fruit colors, as species will ask for them. */
const ACCENT_VARIANTS: [name: string, spec: ArtSpec][] = [
  ['cactus-yellow', { kind: 'cactus', accent: '#FFD54F' }],
  ['orchid-white', { kind: 'orchid', accent: '#FFFFFF' }],
  ['orchid-purple', { kind: 'orchid', accent: '#A77BCA' }],
  ['peace_lily-red', { kind: 'peace_lily', accent: '#E53935' }],
  ['flowers-red', { kind: 'flowers', accent: '#E53935' }],
  ['flowers-pink', { kind: 'flowers', accent: '#F48FB1' }],
  ['flowers-purple', { kind: 'flowers', accent: '#9C6ADE' }],
  ['flowers-yellow', { kind: 'flowers', accent: '#FFD54F' }],
  ['flowers-orange', { kind: 'flowers', accent: '#FFA24C' }],
  ['flowers-white', { kind: 'flowers', accent: '#FFFFFF' }],
  ['flowers-blue', { kind: 'flowers', accent: '#6FA8F0' }],
  ['bromeliad-pink', { kind: 'bromeliad', accent: '#E0407A' }],
  ['bromeliad-yellow', { kind: 'bromeliad', accent: '#FFC53D' }],
  ['lavender-pink', { kind: 'lavender', accent: '#E79AC0' }],
  ['tree-orange', { kind: 'tree', accent: '#FFA02E' }],
  ['tree-olive', { kind: 'tree', accent: '#5E5A3A' }],
  ['veggie-yellow', { kind: 'veggie', accent: '#FFC23D' }],
];

/** Every family with its default colors, some with other colors, then every face on the sprout. */
export function plantPreviews(): Preview[] {
  return [
    ...PLANT_KINDS.map((kind) => ({ group: 'plants', name: kind, svg: plantArtSvg({ kind }) })),
    ...ACCENT_VARIANTS.map(([name, spec]) => ({ group: 'plants', name, svg: plantArtSvg(spec) })),
    ...MOODS.map((mood) => ({ group: 'moods', name: mood, svg: plantArtSvg({ kind: 'sprout' }, { mood }) })),
  ];
}
