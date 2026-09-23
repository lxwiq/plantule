import type { ReactNode } from 'react';
import { View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Button } from './button';
import { Icon, icons, type IconName } from './icon';
import { IconButton } from './icon-button';
import { Text } from './text';

type Tone = 'info' | 'warning' | 'error' | 'success';

type BannerProps = {
  tone?: Tone;
  icon?: IconName;
  title?: string;
  children: ReactNode;
  action?: { label: string; onPress: () => void; loading?: boolean };
  /** Shows a close button. */
  onDismiss?: () => void;
};

/** Inline message inside a screen: offline notice, error with retry, suggestion. */
export function Banner({ tone = 'info', icon, title, children, action, onDismiss }: BannerProps) {
  const theme = useTheme();
  const colors = {
    info: { background: theme.surfaceContainerHigh, content: theme.text },
    warning: { background: theme.warningContainer, content: theme.onWarningContainer },
    error: { background: theme.errorContainer, content: theme.onErrorContainer },
    success: { background: theme.primaryContainer, content: theme.onPrimaryContainer },
  }[tone];
  const defaultIcon = tone === 'error' ? icons.error : tone === 'warning' ? icons.info : icons.info;

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.background,
      }}>
      <Icon name={icon ?? defaultIcon} size={22} color={colors.content} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={{ gap: spacing.xxs }}>
          {title && (
            <Text variant="bodyStrong" color={colors.content}>
              {title}
            </Text>
          )}
          {typeof children === 'string' ? (
            <Text variant="subhead" color={colors.content} selectable>
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
        {action && (
          <Button
            title={action.label}
            onPress={action.onPress}
            loading={action.loading}
            variant="text"
            size="sm"
            style={{ alignSelf: 'flex-start', marginLeft: -spacing.lg }}
          />
        )}
      </View>
      {onDismiss && (
        <IconButton
          icon={icons.close}
          label="Fermer"
          size={32}
          color={colors.content}
          onPress={onDismiss}
          style={{ marginTop: -spacing.xs, marginRight: -spacing.sm }}
        />
      )}
    </View>
  );
}
