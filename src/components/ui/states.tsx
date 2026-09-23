import type { ReactNode } from 'react';
import { View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Button } from './button';
import { Icon, icons, type IconName } from './icon';
import { Text } from './text';

type EmptyStateProps = {
  icon?: IconName;
  /** A drawing shown instead of the icon, such as a <Scene>. */
  art?: ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
};

/** Explains why a list is empty and offers the next step. */
export function EmptyState({ icon = icons.leaf, art, title, message, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
      }}>
      {art ?? (
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primaryContainer,
          }}>
          <Icon name={icon} size={36} color={theme.onPrimaryContainer} />
        </View>
      )}
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message && (
        <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 360 }}>
          {message}
        </Text>
      )}
      {action && (
        <Button
          title={action.label}
          icon={action.icon}
          onPress={action.onPress}
          style={{ marginTop: spacing.sm }}
        />
      )}
    </View>
  );
}
