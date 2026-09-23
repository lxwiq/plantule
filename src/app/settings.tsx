import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Banner, icons, ListRow, ListSection, Screen, SwitchRow, Text } from '@/components/ui';
import { useSettings } from '@/db/hooks';
import { updateSettings } from '@/db/repo';
import {
  notificationPermission,
  requestNotificationPermission,
} from '@/notifications/daily-summary';
import { useTheme } from '@/theme';

function timeToDate(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function dateToTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function Settings() {
  const theme = useTheme();
  const settings = useSettings();
  const [pickingTime, setPickingTime] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined' | null>(null);

  useEffect(() => {
    notificationPermission().then(setPermission, () => setPermission('denied'));
  }, []);

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (!granted) {
      Alert.alert(
        'Notifications désactivées',
        'Autorise les notifications de Plantule dans les réglages du téléphone pour recevoir le résumé.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Ouvrir les réglages', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  };

  return (
    <Screen>
      <ListSection
        title="Résumé quotidien"
        footer="Une notification par jour avec les soins à faire dans le lieu affiché.">
        <SwitchRow
          label="Recevoir le résumé"
          value={settings.daily_summary_enabled}
          onValueChange={(enabled) => {
            updateSettings({ daily_summary_enabled: enabled });
            if (enabled && permission !== 'granted') void enableNotifications();
          }}
        />
        {settings.daily_summary_enabled ? (
          <ListRow
            leading={icons.schedule}
            title="Heure"
            trailing={settings.daily_summary_time}
            onPress={() => setPickingTime(true)}
            chevron
          />
        ) : null}
      </ListSection>
      {settings.daily_summary_enabled && permission && permission !== 'granted' && (
        <Banner
          tone="warning"
          icon={icons.notifications}
          action={{ label: 'Autoriser les notifications', onPress: () => void enableNotifications() }}>
          Les notifications ne sont pas autorisées sur ce téléphone.
        </Banner>
      )}
      {pickingTime && (
        <DateTimePicker
          value={timeToDate(settings.daily_summary_time)}
          mode="time"
          presentation="dialog"
          is24Hour
          accentColor={theme.primary}
          locale="fr_FR"
          onValueChange={(_event, date) => {
            setPickingTime(false);
            updateSettings({ daily_summary_time: dateToTime(date) });
          }}
          onDismiss={() => setPickingTime(false)}
        />
      )}

      <Banner icon={icons.info} title="Tes données restent sur ce téléphone">
        Plantes, soins, journal et photos sont enregistrés uniquement ici. Désinstaller l’app les
        efface.
      </Banner>

      <Text variant="caption" tone="tertiary" selectable style={{ textAlign: 'center' }}>
        Plantule {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}
