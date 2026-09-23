import { Tabs } from 'expo-router';

import { Icon, icons } from '@/components/ui';
import { useDueCount } from '@/hooks/use-due-count';
import { useTheme } from '@/theme';

/** Browser fallback of the native tab bar, for development. */
export function AppTabs() {
  const theme = useTheme();
  const due = useDueCount();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surfaceContainer, borderTopColor: theme.outlineVariant },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Aujourd’hui',
          tabBarBadge: due > 0 ? due : undefined,
          tabBarIcon: ({ color }) => <Icon name={{ ios: 'sun.horizon', android: 'today' }} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: 'Plantes',
          tabBarIcon: ({ color }) => <Icon name={{ ios: 'leaf', android: 'potted_plant' }} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <Icon name={icons.scan} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="place"
        options={{
          title: 'Maison',
          tabBarIcon: ({ color }) => <Icon name={{ ios: 'house', android: 'home' }} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
