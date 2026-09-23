import type { Preview } from '../preview';
import { DEFAULT_OUTFIT } from '../types';

import { SCENES, sceneSvg, type SceneId } from '.';

/** One scene per backdrop tone, also shown in dark mode. */
const DARK: SceneId[] = ['resting', 'welcome', 'dreaming'];

/** Every scene with Pépin in its default outfit, a few in dark mode, and one without its backdrop. */
export function scenePreviews(): Preview[] {
  const outfit = DEFAULT_OUTFIT;
  return [
    ...SCENES.map((id) => ({ group: 'scenes', name: id, svg: sceneSvg(id, { outfit }) })),
    ...DARK.map((id) => ({ group: 'scenes', name: `${id}-dark`, svg: sceneSvg(id, { outfit, dark: true }) })),
    { group: 'scenes', name: 'searching-bare', svg: sceneSvg('searching', { outfit, backdrop: false }) },
  ];
}
