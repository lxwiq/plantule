import { router } from 'expo-router';
import { useMemo } from 'react';

import { PlantThumb } from '@/components/plant-thumb';
import {
  EmptyState,
  IconButton,
  icons,
  ListRow,
  ListSection,
  Screen,
  ScreenTitle,
} from '@/components/ui';
import { useCurrentPlace, usePlants, useRooms, useTasks } from '@/db/hooks';
import type { Plant, Room, Task } from '@/db/types';
import { formatDue } from '@/lib/dates';
import { plural, TASK_KINDS } from '@/lib/labels';

type Group = { key: string; title: string; plants: Plant[] };

/** Plants grouped by room, then those without a room. */
function groupByRoom(plants: Plant[], rooms: Room[]): Group[] {
  const groups: Group[] = rooms.map((room) => ({
    key: room.id,
    title: room.is_outdoor ? `${room.name} · extérieur` : room.name,
    plants: plants.filter((p) => p.room_id === room.id),
  }));
  const loose = plants.filter((p) => !p.room_id);
  if (loose.length > 0) groups.push({ key: 'none', title: 'Sans pièce', plants: loose });
  return groups.filter((g) => g.plants.length > 0);
}

/** "Arrosage demain" for the plant's soonest task. */
function nextCare(plantId: string, tasks: Task[]): string {
  const next = tasks
    .filter((t) => t.plant_id === plantId)
    .reduce<Task | null>((soonest, t) => (!soonest || t.next_due_on < soonest.next_due_on ? t : soonest), null);
  if (!next) return 'Aucun rappel';
  return `${next.label?.trim() || TASK_KINDS[next.kind].label} ${formatDue(next.next_due_on)}`;
}

export default function Plants() {
  const place = useCurrentPlace();
  const plants = usePlants(place.id);
  const rooms = useRooms(place.id);
  const tasks = useTasks(place.id);
  const groups = useMemo(() => groupByRoom(plants, rooms), [plants, rooms]);

  return (
    <Screen topInset>
      <ScreenTitle
        title="Plantes"
        subtitle={`${plural(plants.length, 'plante')} · ${place.name}`}
        actions={
          <IconButton
            icon={icons.add}
            label="Ajouter une plante"
            variant="filled"
            onPress={() => router.push('/plant/new')}
          />
        }
      />
      {plants.length === 0 ? (
        <EmptyState
          title="Aucune plante"
          message="Ajoute ta première plante : un surnom suffit, le reste peut attendre."
          action={{ label: 'Ajouter une plante', icon: icons.add, onPress: () => router.push('/plant/new') }}
        />
      ) : (
        groups.map((group) => (
          <ListSection key={group.key} title={group.title}>
            {group.plants.map((plant) => (
              <ListRow
                key={plant.id}
                leading={<PlantThumb uri={plant.main_photo_uri} size={56} />}
                title={plant.nickname}
                subtitle={[plant.species, nextCare(plant.id, tasks)].filter(Boolean).join('\n')}
                onPress={() => router.push({ pathname: '/plant/[id]', params: { id: plant.id } })}
                chevron
              />
            ))}
          </ListSection>
        ))
      )}
    </Screen>
  );
}
