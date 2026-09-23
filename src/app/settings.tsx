import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking } from 'react-native';

import {
  agendaAvailable,
  agendaPermission,
  disableAgenda,
  enableAgenda,
} from '@/agenda/phone-agenda';
import { ai } from '@/ai';
import { formatBytes } from '@/ai/model-format';
import { ModelCard } from '@/components/ai-model-card';
import { Banner, icons, ListRow, ListSection, Screen, SwitchRow, Text } from '@/components/ui';
import {
  BackupError,
  backupAvailable,
  exportBackup,
  pickBackupFile,
  readBackup,
  restoreBackup,
  type PickedBackup,
} from '@/db/backup';
import { useSettings } from '@/db/hooks';
import { updateSettings } from '@/db/repo';
import { describeBackup, formatLastBackup } from '@/lib/backup';
import { plural } from '@/lib/labels';
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

function scanFooter() {
  const size = ai.info.sizeBytes > 0 ? ` Il pèse ${formatBytes(ai.info.sizeBytes)}, à télécharger une seule fois.` : '';
  return `Le modèle d’IA tourne sur ton téléphone : tes photos ne sont envoyées nulle part.${size}`;
}

const AGENDA_FOOTER =
  'Un agenda « Plantule » sur ce téléphone, avec les soins des 30 prochains jours dans le lieu affiché. Il se met à jour tout seul quand tu coches un soin.';

/** Writes the coming care to an agenda of the phone's calendar app. */
function AgendaSection() {
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined' | null>(null);

  useEffect(() => {
    agendaPermission().then(setPermission, () => setPermission('denied'));
  }, []);

  if (!agendaAvailable) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const { granted } = await enableAgenda();
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        Alert.alert(
          'Accès à l’agenda refusé',
          'Autorise l’agenda pour Plantule dans les réglages du téléphone pour y ajouter les soins de tes plantes.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Ouvrir les réglages', onPress: () => void Linking.openSettings() },
          ],
        );
      }
    } catch {
      Alert.alert('Agenda indisponible', 'L’agenda « Plantule » n’a pas pu être créé sur ce téléphone. Réessaie plus tard.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await disableAgenda();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ListSection title="Agenda" footer={AGENDA_FOOTER}>
        <SwitchRow
          label="Ajouter les soins à mon agenda"
          value={settings.agenda_enabled}
          disabled={busy}
          onValueChange={(enabled) => void (enabled ? enable() : disable())}
        />
      </ListSection>
      {settings.agenda_enabled && permission && permission !== 'granted' && (
        <Banner
          tone="warning"
          icon={icons.calendar}
          action={{ label: 'Autoriser l’agenda', onPress: () => void enable() }}>
          L’agenda n’est pas autorisé sur ce téléphone : les soins n’y sont plus ajoutés.
        </Banner>
      )}
    </>
  );
}

const BACKUP_FOOTER =
  'Un fichier avec tes lieux, plantes, soins, journal, photos, fiches, boutures et envies. Garde-le sur ton Drive ou envoie-le sur ton nouveau téléphone.';

/** Export everything to a file, or replace everything with a backup file. */
function BackupSection() {
  const theme = useTheme();
  const settings = useSettings();
  const [busy, setBusy] = useState<'export' | 'read' | 'import' | null>(null);

  if (!backupAvailable) {
    return (
      <ListSection title="Sauvegarde" footer="La sauvegarde se fait depuis l’app sur le téléphone.">
        {null}
      </ListSection>
    );
  }

  const exportData = async () => {
    setBusy('export');
    try {
      await exportBackup();
    } catch {
      Alert.alert(
        'Export impossible',
        'Le fichier de sauvegarde n’a pas pu être créé. Vérifie la place libre sur le téléphone, puis réessaie.',
      );
    } finally {
      setBusy(null);
    }
  };

  const restore = async (picked: PickedBackup) => {
    setBusy('import');
    try {
      await restoreBackup(picked);
    } catch {
      setBusy(null);
      Alert.alert('Import impossible', 'La sauvegarde n’a pas pu être importée. Rien n’a changé sur ce téléphone.');
      return;
    }
    setBusy(null);
    router.dismissTo('/');
    const { places, plants, photos } = picked.summary;
    Alert.alert(
      'Sauvegarde importée',
      `${plural(places, 'lieu', 'lieux')}, ${plural(plants, 'plante')} et ${plural(photos, 'photo')} sont maintenant sur ce téléphone.`,
    );
  };

  const importData = async () => {
    const file = await pickBackupFile().catch(() => {
      Alert.alert('Import impossible', 'Le sélecteur de fichiers n’a pas pu s’ouvrir. Réessaie.');
      return null;
    });
    if (!file) return;
    setBusy('read');
    let picked: PickedBackup;
    try {
      picked = await readBackup(file);
    } catch (error) {
      Alert.alert(
        'Import impossible',
        error instanceof BackupError ? error.message : 'Le fichier n’a pas pu être lu. Réessaie.',
      );
      return;
    } finally {
      setBusy(null);
    }
    Alert.alert(
      'Remplacer les données de ce téléphone ?',
      `${describeBackup(picked.summary)}\n\nTout ce qui est sur ce téléphone (lieux, plantes, soins, journal, photos, boutures, envies et réglages) sera remplacé par la sauvegarde. C’est définitif.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Remplacer', style: 'destructive', onPress: () => void restore(picked) },
      ],
    );
  };

  const spinner = <ActivityIndicator color={theme.primary} />;
  const importing = busy === 'read' || busy === 'import';
  return (
    <ListSection title="Sauvegarde" footer={BACKUP_FOOTER}>
      <ListRow
        leading={icons.share}
        title="Exporter mes données"
        subtitle={
          busy === 'export'
            ? 'Préparation du fichier…'
            : `Dernière sauvegarde : ${formatLastBackup(settings.last_backup_at)}`
        }
        trailing={busy === 'export' ? spinner : undefined}
        onPress={busy === 'export' ? undefined : () => void exportData()}
        disabled={importing}
      />
      <ListRow
        leading={icons.restore}
        title="Importer une sauvegarde"
        subtitle={
          busy === 'read'
            ? 'Lecture du fichier…'
            : busy === 'import'
              ? 'Import en cours…'
              : 'Remplace les données de ce téléphone'
        }
        trailing={importing ? spinner : undefined}
        onPress={importing ? undefined : () => void importData()}
        disabled={busy === 'export'}
      />
    </ListSection>
  );
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

      <AgendaSection />

      <ListSection title="Scan IA" footer={scanFooter()}>
        <ModelCard />
      </ListSection>

      <BackupSection />

      <Banner icon={icons.info} title="Tes données restent sur ce téléphone">
        Plantes, soins, journal et photos sont enregistrés uniquement ici. Désinstaller l’app ou
        changer de téléphone les efface : exporte une sauvegarde pour les garder.
      </Banner>

      <Text variant="caption" tone="tertiary" selectable style={{ textAlign: 'center' }}>
        Plantule {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}
