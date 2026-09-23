import { Image } from 'expo-image';
import { View } from 'react-native';

import { Icon, icons } from '@/components/ui';
import { radius, useTheme } from '@/theme';

type PlantThumbProps = {
  /** Local file of the photo. */
  uri?: string | null;
  size?: number;
  /** Rounded square by default; circle for small inline uses. */
  shape?: 'square' | 'circle';
};

/** The plant's main photo, or a leaf when it has none. */
export function PlantThumb({ uri, size = 56, shape = 'square' }: PlantThumbProps) {
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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.primaryContainer,
        }}>
        <Icon name={icons.leaf} size={Math.round(size * 0.45)} color={theme.onPrimaryContainer} />
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
