import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { SCENE_HEIGHT, SCENE_WIDTH, sceneSvg, type SceneId } from '@/art/scenes';
import { ArtImage } from '@/components/art';
import { useSettings } from '@/db/hooks';
import { useScheme } from '@/theme';

type SceneProps = {
  id: SceneId;
  /** The height follows, in the scenes' 4:3 frame. */
  width?: number;
  /** Spoken by screen readers; without it the scene is decorative and skipped. */
  label?: string;
  /** False on a colored card, which already makes the backdrop. */
  backdrop?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A cozy scene with Pépin, dressed in its outfit, for the empty and quiet moments of the app. */
export function Scene({ id, width = 240, label, backdrop = true, style }: SceneProps) {
  const { mascot_outfit } = useSettings();
  const dark = useScheme() === 'dark';
  const xml = useMemo(
    () => sceneSvg(id, { outfit: mascot_outfit, dark, backdrop }),
    [id, mascot_outfit, dark, backdrop],
  );
  const height = Math.round((width * SCENE_HEIGHT) / SCENE_WIDTH);
  return <ArtImage xml={xml} width={width} height={height} label={label} style={style} />;
}
