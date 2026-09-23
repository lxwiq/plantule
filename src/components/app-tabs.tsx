import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useDueCount } from '@/hooks/use-due-count';
import { useTheme } from '@/theme';

export function AppTabs() {
  const theme = useTheme();
  const due = useDueCount();

  return (
    <NativeTabs
      backgroundColor={theme.surfaceContainer}
      indicatorColor={theme.secondaryContainer}
      iconColor={{ default: theme.textSecondary, selected: theme.onSecondaryContainer }}
      labelStyle={{
        default: { color: theme.textSecondary },
        selected: { color: theme.text },
      }}
      tintColor={theme.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.horizon', selected: 'sun.horizon.fill' }} md="today" />
        <NativeTabs.Trigger.Label>Aujourd’hui</NativeTabs.Trigger.Label>
        {due > 0 && <NativeTabs.Trigger.Badge>{String(due)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plants">
        <NativeTabs.Trigger.Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} md="potted_plant" />
        <NativeTabs.Trigger.Label>Plantes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scan">
        <NativeTabs.Trigger.Icon sf="camera.viewfinder" md="center_focus_weak" />
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="place">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Maison</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
