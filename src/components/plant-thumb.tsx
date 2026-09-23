import { Image } from 'expo-image';
import { View } from 'react-native';

import type { Mood } from '@/art';
import { PlantArt } from '@/components/art';
import { radius, useTheme } from '@/theme';

type PlantThumbProps = {
  /** Local file of the photo. */
  uri?: string | null;
  /** The plant's species, drawn when there is no photo. */
  species?: string | null;
  /** The face of the drawing's pot, see `plantMood()`. */
  mood?: Mood;
  size?: number;
  /** Rounded square by default; circle for small inline uses. */
  shape?: 'square' | 'circle';
};

/** The plant's main photo, or the drawing of its species on a soft tile when it has none. */
export function PlantThumb({ uri, species, mood = 'happy', size = 56, shape = 'square' }: PlantThumbProps) {
  const theme = useTheme();
  const borderRadius = shape === 'circle' ? radius.full : size >= 96 ? radius.lg : radius.md;
  if (!uri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: theme.primaryContainer,
        }}>
        <PlantArt species={species} mood={mood} size={size} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: theme.surfaceContainerHigh,
      }}
    />
  );
}
