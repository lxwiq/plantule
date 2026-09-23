import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { LastWateringField } from '@/components/last-watering-field';
import { findingsNotes, repotReason } from '@/components/photo-findings';
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
import type { Light, Room, TaskInput } from '@/db/types';
import { careSheetTasks, winterText } from '@/lib/care-sheet';
import { formatDue, formatInterval, today } from '@/lib/dates';
import { parseFindings, potText } from '@/lib/identification';
import { LIGHT_LABELS, TASK_KINDS } from '@/lib/labels';
import { choosePhotoSource, pickPhoto } from '@/lib/pick-photo';
import { firstDueOn } from '@/lib/schedule';
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
  /** What the photo shows besides the species (`serializeFindings`): pot, repotting, notes. */
  findings?: string;
};

/** "Tous les 7 jours, ×1,5 en hiver · à partir d’aujourd’hui" */
function suggestionText(task: TaskInput) {
  const rhythm = [capitalize(formatInterval(task.interval_days)), winterText(task.winter_factor)]
    .filter(Boolean)
    .join(', ');
  const start =
    !task.next_due_on || task.next_due_on === today()
      ? 'à partir d’aujourd’hui'
      : `première fois ${formatDue(task.next_due_on)}`;
  return `${rhythm} · ${start}`;
}

/** The watering task, starting one interval after the last watering when it is known. */
function withLastWatering(task: TaskInput, lastWatered: string | null): TaskInput {
  if (task.kind !== 'water') return task;
  return {
    ...task,
    last_done_on: lastWatered,
    next_due_on: firstDueOn(lastWatered, task.interval_days, task.winter_factor, today()),
  };
}

/** "Salon", "Salon et Bureau", "Salon, Cuisine et Bureau" */
function listText(items: string[]) {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/** The light a species likes, and the rooms of the place that get it. */
function lightHint(light: Light, rooms: Room[]) {
  const label = LIGHT_LABELS[light];
  const text = `Lumière conseillée : ${label.charAt(0).toLowerCase()}${label.slice(1)}.`;
  const matching = rooms.filter((room) => room.light === light).map((room) => room.name);
  if (matching.length === 0) return text;
  const lead = matching.length > 1 ? 'Pièces avec cette exposition' : 'Pièce avec cette exposition';
  return `${text} ${lead} : ${listText(matching)}.`;
}

/** "Conseillé : Terre cuite percée…", under a field, when the sheet has advice for it. */
function adviceHint(advice: string | undefined) {
  const text = advice?.trim();
  return text ? `Conseillé : ${text}` : undefined;
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
  // Rough estimates from the photo, prefilled below for the user to check.
  const [findings] = useState(() => parseFindings(params.findings));
  // Shown on the repotting reminder: why the photo says to repot, or not.
  const repotNote =
    findings?.repot.needed === 'yes'
      ? (repotReason(findings) ?? 'À rempoter, d’après la photo')
      : repotReason(findings);

  const [draft, setDraft] = useState(() => ({
    ...plantDraft(null, params.roomId),
    nickname: capitalize(sheet?.common_name ?? params.nickname ?? ''),
    species: sheet?.scientific_name ?? params.species ?? '',
    pot: (findings && potText(findings.pot)) ?? '',
    // Without a sheet, no repotting reminder: the notes keep the advice.
    notes: findingsNotes(findings, { withRepot: !sheet }),
  }));
  const [photoUri, setPhotoUri] = useState<string | null>(params.photoUri ?? null);
  const [watering, setWatering] = useState(true);
  const [waterEvery, setWaterEvery] = useState(TASK_KINDS.water.defaultInterval);
  const [lastWatered, setLastWatered] = useState<string | null>(null);
  // With a species sheet, the care it suggests replaces the single watering reminder.
  // Repotting comes first thing when the photo shows it is needed.
  const [suggested, setSuggested] = useState(() => {
    if (!sheet) return [];
    const tasks = careSheetTasks(sheet.data, today(), { repotNow: findings?.repot.needed === 'yes' });
    return tasks.map((task) => ({ task, enabled: true }));
  });
  const [saving, setSaving] = useState(false);

  const waterTask = withLastWatering(
    {
      kind: 'water',
      label: null,
      interval_days: waterEvery,
      winter_factor: TASK_KINDS.water.defaultWinterFactor,
    },
    lastWatered,
  );
  const suggestedTasks = suggested.map((item) => ({
    ...item,
    task: withLastWatering(item.task, lastWatered),
  }));
  const suggestsWatering = suggestedTasks.some((item) => item.enabled && item.task.kind === 'water');

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
      suggestedTasks.filter((s) => s.enabled).forEach((s) => createTask(plant.id, s.task));
    } else if (watering) {
      createTask(plant.id, waterTask);
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

        <PlantFields
          draft={draft}
          onChange={setDraft}
          rooms={rooms}
          autoFocus
          roomHint={sheet ? lightHint(sheet.data.light, rooms) : undefined}
          potHint={adviceHint(sheet?.data.pot)}
          substrateHint={adviceHint(sheet?.data.substrate)}
        />

        {sheet ? (
          <>
            <ListSection
              title="Soins proposés"
              footer={`D’après la fiche de ${capitalize(sheet.common_name)}. Tu pourras ajuster ces rappels depuis la fiche de la plante.`}>
              {suggestedTasks.map((item, index) => (
                <SwitchRow
                  key={item.task.kind}
                  label={TASK_KINDS[item.task.kind].label}
                  description={
                    item.task.kind === 'repot' && repotNote
                      ? `${suggestionText(item.task)}\n${repotNote}`
                      : suggestionText(item.task)
                  }
                  value={item.enabled}
                  onValueChange={(enabled) => toggleSuggestion(index, enabled)}
                />
              ))}
            </ListSection>
            {suggestsWatering && <LastWateringField value={lastWatered} onChange={setLastWatered} />}
          </>
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
                description={watering ? suggestionText(waterTask) : undefined}
                value={watering}
                onValueChange={setWatering}
              />
            </ListSection>
            {watering && (
              <>
                <ChoiceChips options={WATER_INTERVALS} value={waterEvery} onChange={setWaterEvery} />
                <LastWateringField value={lastWatered} onChange={setLastWatered} />
              </>
            )}
          </>
        )}
      </Screen>
    </>
  );
}
