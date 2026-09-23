import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { Icon, icons, type IconName } from './icon';
import { Text } from './text';

type ListSectionProps = {
  title?: string;
  /** Right side of the section title, e.g. a text button. */
  action?: ReactNode;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A titled group of rows on a tinted surface, separated by hairlines —
 * the grouped-list pattern, instead of one card per row.
 */
export function ListSection({ title, action, footer, children, style }: ListSectionProps) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {(title || action) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xs,
            minHeight: 32,
          }}>
          {title && (
            <Text variant="overline" tone="secondary" accessibilityRole="header">
              {title}
            </Text>
          )}
          {action}
        </View>
      )}
      {rows.length > 0 && (
        <View
          style={{
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: theme.surfaceContainerLow,
            overflow: 'hidden',
          }}>
          {rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 && (
                <View
                  style={{
                    height: 1,
                    marginLeft: spacing.lg,
                    backgroundColor: theme.outlineVariant,
                    opacity: 0.6,
                  }}
                />
              )}
              {row}
            </Fragment>
          ))}
        </View>
      )}
      {footer && (
        <Text variant="caption" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
          {footer}
        </Text>
      )}
    </View>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string | null;
  /** Icon or custom element (avatar, thumbnail) on the left. */
  leading?: IconName | ReactNode;
  /** Short value or element on the right. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Show a chevron: the row opens another screen. */
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

function isIconName(value: unknown): value is IconName {
  return typeof value === 'object' && value !== null && 'ios' in value && 'android' in value;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  chevron = false,
  destructive = false,
  disabled = false,
  accessibilityHint,
}: ListRowProps) {
  const theme = useTheme();
  const content = (
    <>
      {leading !== undefined &&
        (isIconName(leading) ? (
          <Icon name={leading} size={22} color={destructive ? theme.error : theme.textSecondary} />
        ) : (
          leading
        ))}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="body" tone={destructive ? 'error' : 'default'} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof trailing === 'string' ? (
        <Text variant="subhead" tone="secondary">
          {trailing}
        </Text>
      ) : (
        trailing
      )}
      {chevron && <Icon name={icons.chevronRight} size={20} color={theme.textTertiary} />}
    </>
  );

  const rowStyle: ViewStyle = {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  };

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: theme.outlineVariant }}
      style={({ pressed }) => [
        rowStyle,
        {
          opacity: disabled ? 0.38 : 1,
          backgroundColor:
            process.env.EXPO_OS !== 'android' && pressed ? theme.surfaceContainerHigh : undefined,
        },
      ]}>
      {content}
    </Pressable>
  );
}
