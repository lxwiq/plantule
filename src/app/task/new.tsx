import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { draftIsValid, draftToInput, TaskFields, taskDraft } from '@/components/task-form';
import { HeaderButton, Screen, Text } from '@/components/ui';
import { usePlant } from '@/db/hooks';
import { createTask } from '@/db/repo';
import { closeScreen } from '@/lib/navigation';

export default function NewTask() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const plant = usePlant(plantId);
  const [draft, setDraft] = useState(() => taskDraft());
  const canSave = draftIsValid(draft);

  const save = () => {
    if (!canSave) return;
    createTask(plantId, draftToInput(draft));
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Ajouter" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        {plant && (
          <Text variant="body" tone="secondary">
            Pour {plant.nickname}
          </Text>
        )}
        <TaskFields draft={draft} onChange={setDraft} applyKindDefaults />
      </Screen>
    </>
  );
}
