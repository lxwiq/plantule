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
import { addPhoto, createPlant, createTask, cuttingBecamePlant, deleteWish } from '@/db/repo';
import type { Light, Room, TaskInput } from '@/db/types';
import { careSheetTasks, winterText } from '@/lib/care-sheet';
import { formatDue, formatInterval, today } from '@/lib/dates';
import { parseFindings, potText } from '@/lib/identification';
import { LIGHT_LABELS, TASK_KINDS } from '@/lib/labels';
import { choosePhotoSource, pickDatedPhoto } from '@/lib/pick-photo';
import { findReference } from '@/lib/plant-reference';
import { firstDueOn } from '@/lib/schedule';
import { capitalize } from '@/lib/text';
import { radius, spacing } from '@/theme';

const WATER_INTERVALS = [3, 5, 7, 10, 14, 21];

type Params = {
  roomId?: string;
  // From the scan: the confirmed species' sheet, or just its name when no sheet could be written.
  sheetId?: string;
  species?: string;
  nickname?: string;
  photoUri?: string;
  /** What the photo shows besides the species (`serializeFindings`): pot, repotting, notes. */
  findings?: string;
  /** From a cutting (« En faire une plante »): the cutting the plant grows from, linked once added. */
  cuttingId?: string;
  notes?: string;
  acquiredOn?: string;
  /** When `photoUri` was taken, if known. */
  photoTakenAt?: string;
  /** From the wishlist (« Je l’ai ! »): the wish removed once the plant is added. */
  wishId?: string;
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
function lightHint(light: Light | undefined, rooms: Room[]) {
  if (!light) return undefined;
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
  const fromScan = !params.cuttingId && !params.wishId && !!(params.sheetId || params.species || params.photoUri);
  // Without a sheet, the reference base still knows how often a known species wants water, and its light.
  const [reference] = useState(() => (!sheet && params.species ? findReference(params.species) : null));
  const winterFactor = reference?.watering.winter_factor ?? TASK_KINDS.water.defaultWinterFactor;
  // Rough estimates from the photo, prefilled below for the user to check.
  const [findings] = useState(() => parseFindings(params.findings));
  // Shown on the repotting reminder: why the photo says to repot, or not.
  const repotNote =
    findings?.repot.needed === 'yes'
      ? (repotReason(findings) ?? 'À rempoter, d’après la photo')
      : repotReason(findings);

  const [draft, setDraft] = useState(() => ({
    ...plantDraft(null, params.roomId),
    nickname: capitalize(params.nickname ?? sheet?.common_name ?? ''),
    species: sheet?.scientific_name ?? params.species ?? '',
    acquiredOn: params.acquiredOn ?? null,
    pot: (findings && potText(findings.pot)) ?? '',
    // Without a sheet, no repotting reminder: the notes keep the advice.
    notes: params.notes ?? findingsNotes(findings, { withRepot: !sheet }),
  }));
  // A photo from the scan has no date: it was just taken or picked, it is dated now.
  const [photo, setPhoto] = useState<{ uri: string; takenAt?: string } | null>(
    params.photoUri ? { uri: params.photoUri, takenAt: params.photoTakenAt } : null,
  );
  const [watering, setWatering] = useState(true);
  const [waterEvery, setWaterEvery] = useState(
    reference?.watering.interval_days ?? TASK_KINDS.water.defaultInterval,
  );
  const waterIntervals = [...new Set([...WATER_INTERVALS, waterEvery])]
    .sort((a, b) => a - b)
    .map((days) => ({ value: days, label: `${days} j` }));
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
      winter_factor: winterFactor,
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
      pickDatedPhoto(source).then(
        (picked) => picked && setPhoto(picked),
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
    if (photo) {
      // The plant exists now: a photo that fails to copy is reported, not blocking.
      await addPhoto(plant.id, photo.uri, { takenAt: photo.takenAt }).catch((e) =>
        Alert.alert('Plante ajoutée', `La photo n’a pas pu être enregistrée : ${errorText(e)}`),
      );
    }
    if (params.cuttingId) cuttingBecamePlant(params.cuttingId, plant.id);
    if (params.wishId) deleteWish(params.wishId);
    if (fromScan || params.wishId) {
      // Leave the scan or wishlist screens behind: back from the plant goes to the tabs.
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
          {photo ? (
            <>
              <Image
                source={{ uri: photo.uri }}
                style={{ width: 96, height: 96, borderRadius: radius.lg }}
                contentFit="cover"
                accessibilityLabel="Photo choisie"
              />
              <Button title="Changer" variant="tonal" size="sm" onPress={choosePhoto} />
              <IconButton icon={icons.delete} label="Retirer la photo" onPress={() => setPhoto(null)} />
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
          roomHint={lightHint(sheet?.data.light ?? reference?.light, rooms)}
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
                  ? [
                      reference ? `D’après la base de référence pour ${reference.scientific_name}.` : null,
                      winterFactor === 1
                        ? 'Même rythme en hiver.'
                        : `Allongé automatiquement en hiver (×${String(winterFactor).replace('.', ',')}).`,
                      'Tu pourras ajuster ce rappel et en ajouter d’autres depuis la fiche de la plante.',
                    ]
                      .filter(Boolean)
                      .join(' ')
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
                <ChoiceChips options={waterIntervals} value={waterEvery} onChange={setWaterEvery} />
                <LastWateringField value={lastWatered} onChange={setLastWatered} />
              </>
            )}
          </>
        )}
      </Screen>
    </>
  );
}
