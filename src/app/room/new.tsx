import { Stack } from 'expo-router';
import { useState } from 'react';

import { RoomFields, roomDraft, roomInput } from '@/components/room-form';
import { HeaderButton, Screen } from '@/components/ui';
import { useCurrentPlace } from '@/db/hooks';
import { createRoom } from '@/db/repo';
import { closeScreen } from '@/lib/navigation';

export default function NewRoom() {
  const place = useCurrentPlace();
  const [draft, setDraft] = useState(() => roomDraft());
  const canSave = draft.name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    createRoom(place.id, roomInput(draft));
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Ajouter" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <RoomFields draft={draft} onChange={setDraft} />
      </Screen>
    </>
  );
}
