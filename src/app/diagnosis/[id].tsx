import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { DiagnosisSections } from '@/components/diagnosis-view';
import { Scene } from '@/components/scene';
import { EmptyState, icons, ListRow, ListSection, Screen, Text } from '@/components/ui';
import { useDiagnosis, usePlant } from '@/db/hooks';
import { deleteDiagnosis } from '@/db/repo';
import type { DiagnosisRecord } from '@/db/types';
import { formatRelativeTime, formatShortDate, toDateString } from '@/lib/dates';
import { closeScreen } from '@/lib/navigation';
import { radius, spacing, useTheme } from '@/theme';

/** A diagnosis kept in a plant's health history. */
export default function DiagnosisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = useDiagnosis(id);
  if (!record) {
    return (
      <Screen>
        <EmptyState
          art={<Scene id="searching" />}
          title="Diagnostic introuvable"
          message="Il a peut-être été supprimé."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <DiagnosisDetails record={record} />;
}

function DiagnosisDetails({ record }: { record: DiagnosisRecord }) {
  const theme = useTheme();
  const plant = usePlant(record.plant_id);
  // Deleting it deletes the photo taken for it, unless that photo became the main one.
  const photoGoes = !!record.photo_id && record.photo_id !== plant?.main_photo_id;

  const confirmDelete = () =>
    Alert.alert(
      'Supprimer ce diagnostic ?',
      photoGoes ? 'La photo prise pour ce diagnostic sera supprimée aussi.' : undefined,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            closeScreen();
            deleteDiagnosis(record.id);
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen
        options={{ title: `Diagnostic du ${formatShortDate(toDateString(new Date(record.created_at)))}` }}
      />
      <Screen>
        {record.photo_uri ? (
          <Image
            source={{ uri: record.photo_uri }}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Photo du diagnostic"
            style={{
              width: '100%',
              aspectRatio: 4 / 3,
              borderRadius: radius.xl,
              backgroundColor: theme.surfaceContainerHigh,
            }}
          />
        ) : null}

        <View style={{ gap: spacing.xxs }}>
          {plant ? (
            <Text variant="title" selectable>
              {plant.nickname}
            </Text>
          ) : null}
          <Text variant="subhead" tone="secondary">
            {`Diagnostic ${formatRelativeTime(record.created_at)}`}
          </Text>
        </View>

        <DiagnosisSections diagnosis={record.data} />

        <ListSection>
          <ListRow leading={icons.delete} title="Supprimer le diagnostic" destructive onPress={confirmDelete} />
        </ListSection>
      </Screen>
    </>
  );
}
