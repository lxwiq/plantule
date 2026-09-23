import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { draftToInput, PlantFields, plantDraft } from '@/components/plant-form';
import { Scene } from '@/components/scene';
import { EmptyState, HeaderButton, Screen } from '@/components/ui';
import { usePlant, useRooms } from '@/db/hooks';
import { updatePlant } from '@/db/repo';
import type { Plant } from '@/db/types';
import { speciesKey } from '@/lib/care-sheet';
import { closeScreen } from '@/lib/navigation';

export default function EditPlant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlant(id);
  if (!plant) {
    return (
      <EmptyState
        art={<Scene id="searching" />}
        title="Plante introuvable"
        message="Elle a peut-être été supprimée."
      />
    );
  }
  return <EditPlantForm plant={plant} />;
}

function EditPlantForm({ plant }: { plant: Plant }) {
  const rooms = useRooms(plant.place_id);
  const [draft, setDraft] = useState(() => plantDraft(plant));
  const canSave = draft.nickname.trim().length > 0;
  const hasSheet = plant.species_sheet_id !== null;

  const save = () => {
    if (!canSave) return;
    // Another species: its sheet no longer applies.
    const speciesChanged =
      speciesKey(draft.species).toLowerCase() !== speciesKey(plant.species ?? '').toLowerCase();
    updatePlant(plant.id, {
      ...draftToInput(draft),
      ...(hasSheet && speciesChanged ? { species_sheet_id: null } : {}),
    });
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Enregistrer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <PlantFields
          draft={draft}
          onChange={setDraft}
          rooms={rooms}
          speciesHint={hasSheet ? 'Changer d’espèce retire la fiche espèce de la plante.' : undefined}
        />
      </Screen>
    </>
  );
}
