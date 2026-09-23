import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, touchTarget, useTheme, type Palette } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
type Size = 'md' | 'sm';

function colorsFor(variant: Variant, theme: Palette) {
  switch (variant) {
    case 'filled':
      return { background: theme.primary, content: theme.onPrimary, border: undefined };
    case 'tonal':
      return {
        background: theme.secondaryContainer,
        content: theme.onSecondaryContainer,
        border: undefined,
      };
    case 'outlined':
      return { background: 'transparent', content: theme.primary, border: theme.outline };
    case 'text':
      return { background: 'transparent', content: theme.primary, border: undefined };
    case 'danger':
      return {
        background: theme.errorContainer,
        content: theme.onErrorContainer,
        border: undefined,
      };
  }
}

const sizes = {
  md: { minHeight: touchTarget, paddingHorizontal: spacing.xl, iconSize: 20 },
  sm: { minHeight: 36, paddingHorizontal: spacing.lg, iconSize: 18 },
} as const;

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'filled',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const colors = colorsFor(variant, theme);
  const { iconSize, ...sizeStyle } = sizes[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: theme.outlineVariant, foreground: true }}
      style={({ pressed }) => [
        {
          ...sizeStyle,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderRadius: radius.full,
          overflow: 'hidden',
          backgroundColor: colors.background,
          borderWidth: colors.border ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.38 : process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.content} size="small" />
      ) : (
        icon && <Icon name={icon} size={iconSize} color={colors.content} />
      )}
      <View>
        <Text variant="label" color={colors.content} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
