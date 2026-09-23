import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { radius, touchTarget, useTheme } from '@/theme';

import { Icon, type IconName } from './icon';

type Variant = 'standard' | 'tonal' | 'filled';

type IconButtonProps = {
  icon: IconName;
  /** Read by screen readers: icon-only buttons have no visible text. */
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: number;
  disabled?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'standard',
  size = touchTarget,
  disabled = false,
  color,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'filled'
      ? theme.primary
      : variant === 'tonal'
        ? theme.secondaryContainer
        : 'transparent';
  const content =
    color ??
    (variant === 'filled'
      ? theme.onPrimary
      : variant === 'tonal'
        ? theme.onSecondaryContainer
        : theme.textSecondary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size < touchTarget ? (touchTarget - size) / 2 : undefined}
      android_ripple={{ color: theme.outlineVariant, borderless: variant === 'standard' }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          overflow: variant === 'standard' ? 'visible' : 'hidden',
          opacity: disabled ? 0.38 : process.env.EXPO_OS === 'ios' && pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <Icon name={icon} size={Math.round(size * 0.5)} color={content} />
    </Pressable>
  );
}
