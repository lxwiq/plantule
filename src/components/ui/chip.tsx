import { Pressable, ScrollView, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Icon, icons, type IconName } from './icon';
import { Text } from './text';

type ChipProps = {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
};

/** Material filter chip: one choice among a few, or a quick action. */
export function Chip({ label, selected = false, icon, onPress }: ChipProps) {
  const theme = useTheme();
  const content = selected ? theme.onSecondaryContainer : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={{ color: theme.outlineVariant }}
      style={({ pressed }) => ({
        minHeight: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
        borderCurve: 'continuous',
        overflow: 'hidden',
        borderWidth: selected ? 0 : 1,
        borderColor: theme.outline,
        backgroundColor: selected ? theme.secondaryContainer : 'transparent',
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
      })}>
      {selected ? (
        <Icon name={icons.check} size={18} color={content} />
      ) : (
        icon && <Icon name={icon} size={18} color={content} />
      )}
      <Text variant="label" color={content}>
        {label}
      </Text>
    </Pressable>
  );
}

type ChoiceChipsProps<T extends string | number> = {
  options: readonly { value: T; label: string; icon?: IconName }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Scroll horizontally instead of wrapping. */
  scroll?: boolean;
};

/** A single-choice row of chips. */
export function ChoiceChips<T extends string | number>({
  options,
  value,
  onChange,
  scroll = false,
}: ChoiceChipsProps<T>) {
  const chips = options.map((option) => (
    <Chip
      key={String(option.value)}
      label={option.label}
      icon={option.icon}
      selected={option.value === value}
      onPress={() => onChange(option.value)}
    />
  ));
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{chips}</View>;
}
