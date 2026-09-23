import { Host, Switch } from '@expo/ui';
import { View } from 'react-native';

import { spacing, touchTarget, useTheme } from '@/theme';

import { Text } from './text';

type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** A labelled native switch (Compose on Android, SwiftUI on iOS). */
export function SwitchRow({ label, description, value, onValueChange, disabled }: SwitchRowProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        minHeight: touchTarget + 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="body">{label}</Text>
        {description && (
          <Text variant="subhead" tone="secondary">
            {description}
          </Text>
        )}
      </View>
      <Host matchContents seedColor={theme.primary}>
        <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
      </Host>
    </View>
  );
}
