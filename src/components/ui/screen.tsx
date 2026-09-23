import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

import { Text } from './text';

type ScreenProps = ScrollViewProps & {
  children: ReactNode;
  /** Pull to refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Pad the top with the status bar height (screens without a stack header). */
  topInset?: boolean;
};

/** Scrollable screen body with the app background and edge padding. */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  topInset = false,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[
        {
          padding: spacing.lg,
          paddingTop: topInset ? insets.top + spacing.lg : spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.xl,
          // Keep a phone-like column on tablets and in the browser.
          width: '100%',
          maxWidth: 640,
          alignSelf: 'center',
        },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
            progressBackgroundColor={theme.surfaceContainerHigh}
          />
        ) : undefined
      }
      {...rest}>
      {children}
    </ScrollView>
  );
}

type ScreenTitleProps = {
  title: string;
  subtitle?: string;
  /** Buttons on the right of the title. */
  actions?: ReactNode;
};

/** Large title for tab screens, which have no stack header. */
export function ScreenTitle({ title, subtitle, actions }: ScreenTitleProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text variant="subhead" tone="secondary">
            {subtitle}
          </Text>
        )}
      </View>
      {actions && <View style={{ flexDirection: 'row', gap: spacing.xs }}>{actions}</View>}
    </View>
  );
}

type HeaderButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Text action in a stack header, e.g. "Enregistrer" on a form. */
export function HeaderButton({ title, onPress, loading = false, disabled = false }: HeaderButtonProps) {
  const theme = useTheme();
  if (loading) {
    return (
      <View style={{ paddingHorizontal: spacing.md }}>
        <ActivityIndicator color={theme.primary} accessibilityLabel={`${title} en cours`} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        opacity: disabled ? 0.38 : pressed ? 0.6 : 1,
      })}>
      <Text variant="label" tone="primary" style={{ fontSize: 16 }}>
        {title}
      </Text>
    </Pressable>
  );
}
