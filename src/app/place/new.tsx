import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { HeaderButton, Screen, Text, TextField } from '@/components/ui';
import { selectPlace } from '@/db/hooks';
import { createPlace } from '@/db/repo';

export default function NewPlace() {
  const [name, setName] = useState('');
  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const place = createPlace(name);
    selectPlace(place.id);
    router.dismissTo('/place');
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Créer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <TextField
          label="Nom du lieu"
          placeholder="Maison de campagne, bureau…"
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="sentences"
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <Text variant="subhead" tone="secondary">
          Chaque lieu a ses pièces et ses plantes. Tu passes de l’un à l’autre depuis l’onglet Maison.
        </Text>
      </Screen>
    </>
  );
}
