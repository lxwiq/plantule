import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { EmptyState, HeaderButton, Screen } from '@/components/ui';
import { draftToWishInput, WishFields, wishDraft } from '@/components/wish-form';
import { useWish } from '@/db/hooks';
import { updateWish } from '@/db/repo';
import type { Wish } from '@/db/types';
import { closeScreen } from '@/lib/navigation';

export default function EditWish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wish = useWish(id);
  if (!wish) return <EmptyState title="Envie introuvable" message="Elle a peut-être été supprimée." />;
  return <EditWishForm wish={wish} />;
}

function EditWishForm({ wish }: { wish: Wish }) {
  const [draft, setDraft] = useState(() => wishDraft(wish));
  const canSave = draft.species.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updateWish(wish.id, draftToWishInput(draft));
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Enregistrer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <WishFields draft={draft} onChange={setDraft} />
      </Screen>
    </>
  );
}
