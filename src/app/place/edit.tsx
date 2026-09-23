import { Stack } from 'expo-router';
import { useState } from 'react';

import { HeaderButton, Screen, TextField } from '@/components/ui';
import { useCurrentPlace } from '@/db/hooks';
import { renamePlace } from '@/db/repo';
import { closeScreen } from '@/lib/navigation';

export default function EditPlace() {
  const place = useCurrentPlace();
  const [name, setName] = useState(place.name);
  const canSave = name.trim().length > 0 && name.trim() !== place.name;

  const save = () => {
    if (!canSave) return;
    renamePlace(place.id, name);
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Enregistrer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <TextField
          label="Nom du lieu"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </Screen>
    </>
  );
}
