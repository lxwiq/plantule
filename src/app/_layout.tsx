import { Fraunces_600SemiBold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DATABASE_NAME, initDatabase } from '@/db/database';
import { useCurrentPlace, usePlants, useSettings, useTasks } from '@/db/hooks';
import { ensurePlace } from '@/db/repo';
import { syncDailySummary } from '@/notifications/daily-summary';
import { palettes, typography, useScheme, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

async function prepareDatabase(db: SQLiteDatabase) {
  await initDatabase(db);
  // First launch: create the first place, so there is always one.
  ensurePlace();
}

function useNavigationTheme() {
  const scheme = useScheme();
  const colors = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.outlineVariant,
      notification: colors.error,
    },
  };
}

/** Reschedules the daily summary whenever tasks, plants or settings change. */
function DailySummarySync() {
  const settings = useSettings();
  const place = useCurrentPlace();
  const tasks = useTasks(place.id);
  const plants = usePlants(place.id);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncDailySummary({ settings, tasks, plants }).catch(() => undefined);
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings, tasks, plants]);

  return null;
}

export default function RootLayout() {
  // The app renders once the database is open and migrated.
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={prepareDatabase}>
      <App />
    </SQLiteProvider>
  );
}

function App() {
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold });
  const ready = fontsLoaded || !!fontError;
  const theme = useTheme();
  const navigationTheme = useNavigationTheme();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Keep the splash screen until the title font is there.
  if (!ready) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="auto" />
      <DailySummarySync />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { ...typography.heading, color: theme.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plant/new" options={{ title: 'Nouvelle plante', presentation: 'modal' }} />
        <Stack.Screen name="plant/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="plant/[id]/edit" options={{ title: 'Modifier la plante', presentation: 'modal' }} />
        <Stack.Screen name="plant/[id]/diagnose" options={{ title: 'Diagnostic' }} />
        <Stack.Screen name="plant/[id]/ask" options={{ title: 'Demande à Plantule' }} />
        <Stack.Screen name="diagnosis/[id]" options={{ title: 'Diagnostic' }} />
        <Stack.Screen name="task/new" options={{ title: 'Nouvelle tâche', presentation: 'modal' }} />
        <Stack.Screen
          name="task/[id]/index"
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: 'fitToContents',
            headerShown: false,
          }}
        />
        <Stack.Screen name="task/[id]/edit" options={{ title: 'Modifier la tâche', presentation: 'modal' }} />
        <Stack.Screen name="room/new" options={{ title: 'Nouvelle pièce', presentation: 'modal' }} />
        <Stack.Screen name="room/[id]" options={{ title: 'Modifier la pièce', presentation: 'modal' }} />
        <Stack.Screen name="place/new" options={{ title: 'Nouveau lieu', presentation: 'modal' }} />
        <Stack.Screen name="place/edit" options={{ title: 'Renommer le lieu', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Réglages' }} />
        <Stack.Screen name="scan/identify" options={{ title: 'Identification' }} />
        <Stack.Screen name="scan/sheet" options={{ title: 'Fiche espèce' }} />
      </Stack>
    </ThemeProvider>
  );
}
