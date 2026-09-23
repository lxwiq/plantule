import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { cuttingDraft, CuttingFields, draftToCuttingInput } from '@/components/cutting-form';
import { Scene } from '@/components/scene';
import { EmptyState, HeaderButton, Screen } from '@/components/ui';
import { useCutting, usePlants } from '@/db/hooks';
import { setCuttingPhoto, updateCutting } from '@/db/repo';
import type { Cutting } from '@/db/types';
import { closeScreen } from '@/lib/navigation';

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Une erreur est survenue.');

export default function EditCutting() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cutting = useCutting(id);
  if (!cutting) {
    return (
      <EmptyState
        art={<Scene id="searching" />}
        title="Bouture introuvable"
        message="Elle a peut-être été supprimée."
      />
    );
  }
  return <EditCuttingForm cutting={cutting} />;
}

function EditCuttingForm({ cutting }: { cutting: Cutting }) {
  const plants = usePlants(cutting.place_id);
  const [draft, setDraft] = useState(() => cuttingDraft(cutting));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    updateCutting(cutting.id, draftToCuttingInput(draft));
    if (draft.photo?.uri !== (cutting.photo_uri ?? undefined)) {
      await setCuttingPhoto(cutting.id, draft.photo).catch((e) =>
        Alert.alert('Bouture', `La photo n’a pas pu être enregistrée : ${errorText(e)}`),
      );
    }
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderButton title="Enregistrer" onPress={() => void save()} loading={saving} />,
        }}
      />
      <Screen>
        <CuttingFields draft={draft} onChange={setDraft} plants={plants} />
      </Screen>
    </>
  );
}
