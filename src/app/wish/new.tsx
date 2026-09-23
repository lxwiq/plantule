import { Stack } from 'expo-router';
import { useState } from 'react';

import { HeaderButton, Screen } from '@/components/ui';
import { draftToWishInput, WishFields, wishDraft } from '@/components/wish-form';
import { createWish } from '@/db/repo';
import { closeScreen } from '@/lib/navigation';

export default function NewWish() {
  const [draft, setDraft] = useState(() => wishDraft());
  const canSave = draft.species.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    createWish(draftToWishInput(draft));
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Ajouter" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <WishFields draft={draft} onChange={setDraft} autoFocus />
      </Screen>
    </>
  );
}
