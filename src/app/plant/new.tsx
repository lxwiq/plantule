import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { draftToInput, PlantFields, plantDraft } from '@/components/plant-form';
import {
  Button,
  ChoiceChips,
  HeaderButton,
  IconButton,
  icons,
  ListSection,
  Screen,
  SwitchRow,
} from '@/components/ui';
import { useCurrentPlace, useRooms, useSpeciesSheet } from '@/db/hooks';
import { addPhoto, createPlant, createTask } from '@/db/repo';
import type { TaskInput } from '@/db/types';
import { careSheetTasks, formatCareInterval, winterText } from '@/lib/care-sheet';
import { formatDue, today } from '@/lib/dates';
import { TASK_KINDS } from '@/lib/labels';
import { choosePhotoSource, pickPhoto } from '@/lib/pick-photo';
import { capitalize } from '@/lib/text';
import { radius, spacing } from '@/theme';

const WATER_INTERVALS = [3, 5, 7, 10, 14, 21].map((days) => ({ value: days, label: `${days} j` }));

type Params = {
  roomId?: string;
  // From the scan: the confirmed species' sheet, or just its name when no sheet could be written.
  sheetId?: string;
  species?: string;
  nickname?: string;
  photoUri?: string;
};

/** "Tous les 7 jours, ×1,5 en hiver · à partir d’aujourd’hui" */
function suggestionText(task: TaskInput) {
  const rhythm = [capitalize(formatCareInterval(task.interval_days)), winterText(task.winter_factor)]
    .filter(Boolean)
    .join(', ');
  const start =
    !task.next_due_on || task.next_due_on === today()
      ? 'à partir d’aujourd’hui'
      : `première fois ${formatDue(task.next_due_on)}`;
  return `${rhythm} · ${start}`;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

export default function NewPlant() {
  const place = useCurrentPlace();
  const params = useLocalSearchParams<Params>();
  const rooms = useRooms(place.id);
  const sheet = useSpeciesSheet(params.sheetId);
  const fromScan = !!(params.sheetId || params.species || params.photoUri);

  const [draft, setDraft] = useState(() => ({
    ...plantDraft(null, params.roomId),
    nickname: capitalize(sheet?.common_name ?? params.nickname ?? ''),
    species: sheet?.scientific_name ?? params.species ?? '',
  }));
  const [photoUri, setPhotoUri] = useState<string | null>(params.photoUri ?? null);
  const [watering, setWatering] = useState(true);
  const [waterEvery, setWaterEvery] = useState(TASK_KINDS.water.defaultInterval);
  // With a species sheet, the care it suggests replaces the single watering reminder.
  const [suggested, setSuggested] = useState(() =>
    sheet ? careSheetTasks(sheet.data).map((task) => ({ task, enabled: true })) : [],
  );
  const [saving, setSaving] = useState(false);

  const canSave = draft.nickname.trim().length > 0 && !saving;

  const choosePhoto = () =>
    choosePhotoSource((source) => {
      pickPhoto(source).then(
        (uri) => uri && setPhotoUri(uri),
        (e) => Alert.alert('Photo', errorText(e)),
      );
    });

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const plant = createPlant(place.id, { ...draftToInput(draft), species_sheet_id: sheet?.id ?? null });
    if (sheet) {
      suggested.filter((s) => s.enabled).forEach((s) => createTask(plant.id, s.task));
    } else if (watering) {
      createTask(plant.id, {
        kind: 'water',
        label: null,
        interval_days: waterEvery,
        winter_factor: TASK_KINDS.water.defaultWinterFactor,
      });
    }
    if (photoUri) {
      // The plant exists now: a photo that fails to copy is reported, not blocking.
      await addPhoto(plant.id, photoUri).catch((e) =>
        Alert.alert('Plante ajoutée', `La photo n’a pas pu être enregistrée : ${errorText(e)}`),
      );
    }
    if (fromScan) {
      // Leave the scan screens behind: back from the plant goes to the tabs.
      router.dismissAll();
      router.push({ pathname: '/plant/[id]', params: { id: plant.id } });
    } else {
      router.replace({ pathname: '/plant/[id]', params: { id: plant.id } });
    }
  };

  const toggleSuggestion = (index: number, enabled: boolean) =>
    setSuggested((list) => list.map((item, i) => (i === index ? { ...item, enabled } : item)));

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton title="Ajouter" onPress={() => void save()} loading={saving} disabled={!canSave} />
          ),
        }}
      />
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          {photoUri ? (
            <>
              <Image
                source={{ uri: photoUri }}
                style={{ width: 96, height: 96, borderRadius: radius.lg }}
                contentFit="cover"
                accessibilityLabel="Photo choisie"
              />
              <Button title="Changer" variant="tonal" size="sm" onPress={choosePhoto} />
              <IconButton icon={icons.delete} label="Retirer la photo" onPress={() => setPhotoUri(null)} />
            </>
          ) : (
            <Button title="Ajouter une photo" icon={icons.camera} variant="tonal" onPress={choosePhoto} />
          )}
        </View>

        <PlantFields draft={draft} onChange={setDraft} rooms={rooms} autoFocus />

        {sheet ? (
          <ListSection
            title="Soins proposés"
            footer={`D’après la fiche de ${capitalize(sheet.common_name)}. Tu pourras ajuster ces rappels depuis la fiche de la plante.`}>
            {suggested.map((item, index) => (
              <SwitchRow
                key={item.task.kind}
                label={TASK_KINDS[item.task.kind].label}
                description={suggestionText(item.task)}
                value={item.enabled}
                onValueChange={(enabled) => toggleSuggestion(index, enabled)}
              />
            ))}
          </ListSection>
        ) : (
          <>
            <ListSection
              title="Arrosage"
              footer={
                watering
                  ? 'Allongé automatiquement en hiver (×1,5). Tu pourras ajuster ce rappel et en ajouter d’autres depuis la fiche de la plante.'
                  : undefined
              }>
              <SwitchRow
                label="Me rappeler d’arroser"
                description={watering ? `Tous les ${waterEvery} jours, à partir d’aujourd’hui` : undefined}
                value={watering}
                onValueChange={setWatering}
              />
            </ListSection>
            {watering && <ChoiceChips options={WATER_INTERVALS} value={waterEvery} onChange={setWaterEvery} />}
          </>
        )}
      </Screen>
    </>
  );
}
