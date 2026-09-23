import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { RoomFields, roomDraft, roomInput } from '@/components/room-form';
import { Scene } from '@/components/scene';
import { EmptyState, HeaderButton, icons, ListRow, ListSection, Screen } from '@/components/ui';
import { useCurrentPlace, usePlants, useRooms } from '@/db/hooks';
import { deleteRoom, updateRoom } from '@/db/repo';
import type { Room } from '@/db/types';
import { plural } from '@/lib/labels';
import { closeScreen } from '@/lib/navigation';

export default function EditRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = useCurrentPlace();
  const room = useRooms(place.id).find((r) => r.id === id);
  if (!room) {
    return (
      <EmptyState
        art={<Scene id="searching" />}
        title="Pièce introuvable"
        message="Elle a peut-être été supprimée."
      />
    );
  }
  return <EditRoomForm room={room} />;
}

function EditRoomForm({ room }: { room: Room }) {
  const plants = usePlants(room.place_id);
  const [draft, setDraft] = useState(() => roomDraft(room));
  const canSave = draft.name.trim().length > 0;
  const plantCount = plants.filter((p) => p.room_id === room.id).length;

  const save = () => {
    if (!canSave) return;
    updateRoom(room.id, roomInput(draft));
    closeScreen();
  };

  const confirmDelete = () =>
    Alert.alert(
      `Supprimer « ${room.name} » ?`,
      plantCount > 0 ? `${plural(plantCount, 'plante')} resteront dans le lieu, sans pièce.` : undefined,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            closeScreen();
            deleteRoom(room.id);
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Enregistrer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <RoomFields draft={draft} onChange={setDraft} />
        <ListSection>
          <ListRow leading={icons.delete} title="Supprimer la pièce" destructive onPress={confirmDelete} />
        </ListSection>
      </Screen>
    </>
  );
}
