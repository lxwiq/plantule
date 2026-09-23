import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

type ProgressBarProps = {
  /** Between 0 and 1. */
  progress: number;
  /** Read by screen readers, e.g. "Téléchargement du modèle". */
  label: string;
  /** Track color, when the bar sits on a tinted surface. */
  trackColor?: string;
};

/** A thin determinate progress bar, for downloads. */
export function ProgressBar({ progress, label, trackColor }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height: 6,
        borderRadius: radius.full,
        backgroundColor: trackColor ?? theme.surfaceContainerHighest,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${Math.max(clamped * 100, 1)}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: theme.primary,
        }}
      />
    </View>
  );
}
