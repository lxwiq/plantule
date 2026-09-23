import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { UpdateBanner } from '@/components/app-update';
import { PepinGreeting } from '@/components/pepin-greeting';
import { Scene } from '@/components/scene';
import { TaskRow } from '@/components/task-row';
import {
  Banner,
  EmptyState,
  icons,
  IconButton,
  ListSection,
  Screen,
  ScreenTitle,
  Text,
} from '@/components/ui';
import { useCurrentPlace, usePlants, useRooms, useSettings, useTasks, useWeather } from '@/db/hooks';
import type { Plant, Room, Task } from '@/db/types';
import { careActions } from '@/lib/care-actions';
import { formatLongDate, today } from '@/lib/dates';
import { plural } from '@/lib/labels';
import { groupTasks } from '@/lib/tasks';
import { capitalize } from '@/lib/text';
import { rainExpected, rainExpectedText, rainWateredText } from '@/lib/weather';
import {
  notificationPermission,
  requestNotificationPermission,
} from '@/notifications/daily-summary';
import { spacing } from '@/theme';

/** Offers to turn on the daily summary until the user decides. */
function NotificationPrompt() {
  const { daily_summary_enabled } = useSettings();
  const [status, setStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  useEffect(() => {
    notificationPermission().then(setStatus, () => setStatus('denied'));
  }, []);
  if (!daily_summary_enabled || status !== 'undetermined') return null;
  return (
    <Banner
      icon={icons.notifications}
      title="Résumé du jour"
      action={{
        label: 'Activer les notifications',
        onPress: () => {
          requestNotificationPermission().then(
            (granted) => setStatus(granted ? 'granted' : 'denied'),
            () => setStatus('denied'),
          );
        },
      }}>
      Reçois chaque matin la liste des plantes à soigner.
    </Banner>
  );
}

/**
 * What the rain did for the outdoor plants today, and a hint to wait when rain
 * is on its way while some of them are due.
 */
function RainNotices({
  placeId,
  tasks,
  plants,
  rooms,
}: {
  placeId: string;
  tasks: Task[];
  plants: Plant[];
  rooms: Room[];
}) {
  const weather = useWeather(placeId);
  const day = today();
  if (!weather) return null;

  const outdoorRooms = new Set(rooms.filter((r) => r.is_outdoor).map((r) => r.id));
  const outdoorPlants = new Set(plants.filter((p) => p.room_id && outdoorRooms.has(p.room_id)).map((p) => p.id));
  const waterOutside = tasks.some(
    (t) => t.kind === 'water' && t.next_due_on <= day && outdoorPlants.has(t.plant_id),
  );
  const expected = waterOutside ? rainExpected(weather, day) : null;
  const watered = weather.watered?.on === day ? weather.watered : null;

  return (
    <>
      {watered && (
        <Banner tone="success" icon={icons.rain}>
          {rainWateredText(watered.mm, watered.rain_day, watered.plants, day)}
        </Banner>
      )}
      {expected !== null && (
        <Banner icon={icons.rain} title="Pluie prévue aujourd’hui">
          {rainExpectedText(expected)}
        </Banner>
      )}
    </>
  );
}

export default function Today() {
  const place = useCurrentPlace();
  const tasks = useTasks(place.id);
  const plants = usePlants(place.id);
  const rooms = useRooms(place.id);

  const day = today();
  const plantsById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);
  const roomNames = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);
  const groups = useMemo(() => groupTasks(tasks, day), [tasks, day]);

  const renderRows = (list: Task[], withCheck: boolean) =>
    list.map((task) => {
      const plant = plantsById.get(task.plant_id);
      if (!plant) return null;
      return (
        <TaskRow
          key={task.id}
          task={task}
          plant={plant}
          roomName={plant.room_id ? roomNames.get(plant.room_id) : null}
          onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
          onComplete={withCheck ? () => careActions.complete(task.id) : undefined}
        />
      );
    });

  const toDo = groups.overdue.length + groups.dueToday.length;

  return (
    <Screen topInset>
      <ScreenTitle
        title="Aujourd’hui"
        subtitle={`${capitalize(formatLongDate(day))} · ${place.name}`}
        actions={
          <>
            <IconButton icon={icons.calendar} label="Calendrier" onPress={() => router.push('/calendar')} />
            <IconButton icon={icons.settings} label="Réglages" onPress={() => router.push('/settings')} />
          </>
        }
      />

      <PepinGreeting tasks={tasks} plantCount={plants.length} />

      <UpdateBanner />

      {plants.length === 0 ? (
        <EmptyState
          art={<Scene id="welcome" />}
          title="Aucune plante pour l’instant"
          message="Ajoute tes plantes et leurs soins : chaque jour, cet écran te dira de qui prendre soin."
          action={{ label: 'Ajouter une plante', icon: icons.add, onPress: () => router.push('/plant/new') }}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          art={<Scene id="watering" />}
          title="Aucun rappel"
          message="Ouvre une plante pour lui ajouter un arrosage ou un autre soin régulier."
          action={{ label: 'Voir les plantes', onPress: () => router.navigate('/plants') }}
        />
      ) : (
        <>
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading" accessibilityLiveRegion="polite">
              {toDo === 0 ? 'Tout est fait pour aujourd’hui' : `${plural(toDo, 'soin')} à faire`}
            </Text>
          </View>

          <NotificationPrompt />
          <RainNotices placeId={place.id} tasks={tasks} plants={plants} rooms={rooms} />

          {toDo === 0 && (
            <EmptyState
              art={<Scene id="resting" />}
              title="Rien à faire"
              message="Toutes tes plantes sont à jour. Repose-toi, et reviens demain !"
            />
          )}
          {groups.overdue.length > 0 && (
            <ListSection title="En retard">{renderRows(groups.overdue, true)}</ListSection>
          )}
          {groups.dueToday.length > 0 && (
            <ListSection title="Aujourd’hui">{renderRows(groups.dueToday, true)}</ListSection>
          )}
          {groups.doneToday.length > 0 && (
            <ListSection title="Fait aujourd’hui">{renderRows(groups.doneToday, false)}</ListSection>
          )}
          {groups.upcoming.length > 0 && (
            <ListSection title="Cette semaine">{renderRows(groups.upcoming, false)}</ListSection>
          )}
        </>
      )}
    </Screen>
  );
}
