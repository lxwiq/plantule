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
import { useCurrentPlace, useRooms } from '@/db/hooks';
import { addPhoto, createPlant, createTask } from '@/db/repo';
import { TASK_KINDS } from '@/lib/labels';
import { choosePhotoSource, pickPhoto } from '@/lib/pick-photo';
import { radius, spacing } from '@/theme';

const WATER_INTERVALS = [3, 5, 7, 10, 14, 21].map((days) => ({ value: days, label: `${days} j` }));

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

export default function NewPlant() {
  const place = useCurrentPlace();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const rooms = useRooms(place.id);

  const [draft, setDraft] = useState(() => plantDraft(null, params.roomId));
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [watering, setWatering] = useState(true);
  const [waterEvery, setWaterEvery] = useState(TASK_KINDS.water.defaultInterval);
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
    const plant = createPlant(place.id, draftToInput(draft));
    if (watering) {
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
    router.replace({ pathname: '/plant/[id]', params: { id: plant.id } });
  };

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
      </Screen>
    </>
  );
}
