import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { cuttingDraft, CuttingFields, draftToCuttingInput } from '@/components/cutting-form';
import { HeaderButton, Screen } from '@/components/ui';
import { useCurrentPlace, usePlants } from '@/db/hooks';
import { createCutting, setCuttingPhoto } from '@/db/repo';
import { closeScreen } from '@/lib/navigation';

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Une erreur est survenue.');

export default function NewCutting() {
  const { parentId } = useLocalSearchParams<{ parentId?: string }>();
  const place = useCurrentPlace();
  const plants = usePlants(place.id);
  const [draft, setDraft] = useState(() => cuttingDraft(null, plants.find((p) => p.id === parentId)));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const cutting = createCutting(place.id, draftToCuttingInput(draft));
    if (draft.photo) {
      // The cutting exists now: a photo that fails to copy is reported, not blocking.
      await setCuttingPhoto(cutting.id, draft.photo).catch((e) =>
        Alert.alert('Bouture ajoutée', `La photo n’a pas pu être enregistrée : ${errorText(e)}`),
      );
    }
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderButton title="Ajouter" onPress={() => void save()} loading={saving} />,
        }}
      />
      <Screen>
        <CuttingFields draft={draft} onChange={setDraft} plants={plants} />
      </Screen>
    </>
  );
}
