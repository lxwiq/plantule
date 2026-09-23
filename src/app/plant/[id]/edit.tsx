import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { draftToInput, PlantFields, plantDraft } from '@/components/plant-form';
import { EmptyState, HeaderButton, Screen } from '@/components/ui';
import { usePlant, useRooms } from '@/db/hooks';
import { updatePlant } from '@/db/repo';
import type { Plant } from '@/db/types';
import { closeScreen } from '@/lib/navigation';

export default function EditPlant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlant(id);
  if (!plant) return <EmptyState title="Plante introuvable" message="Elle a peut-être été supprimée." />;
  return <EditPlantForm plant={plant} />;
}

function EditPlantForm({ plant }: { plant: Plant }) {
  const rooms = useRooms(plant.place_id);
  const [draft, setDraft] = useState(() => plantDraft(plant));
  const canSave = draft.nickname.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updatePlant(plant.id, draftToInput(draft));
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Enregistrer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <PlantFields draft={draft} onChange={setDraft} rooms={rooms} />
      </Screen>
    </>
  );
}
