import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, icons, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

/** After this, the wait gets its own explanation. */
const SLOW_AFTER_MS = 8000;

type AiProgressProps = {
  title: string;
  detail: string;
  /** Replaces the texts when the model takes long (loading into memory, long answer). */
  slowTitle: string;
  slowDetail: string;
  onCancel: () => void;
};

/** The model is working: what it does, and a way out. */
export function AiProgress({ title, detail, slowTitle, slowDetail, onCancel }: AiProgressProps) {
  const theme = useTheme();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ gap: spacing.lg }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <ActivityIndicator color={theme.primary} size="large" />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="heading">{slow ? slowTitle : title}</Text>
          <Text variant="subhead" tone="secondary">
            {slow ? slowDetail : detail}
          </Text>
        </View>
      </View>
      <Button title="Annuler" icon={icons.close} variant="outlined" onPress={onCancel} />
    </View>
  );
}
