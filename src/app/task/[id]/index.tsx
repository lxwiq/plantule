import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskKindBadge } from '@/components/task-row';
import { Banner, Button, Chip, icons, Text } from '@/components/ui';
import { usePlant, useTask } from '@/db/hooks';
import { updateTask } from '@/db/repo';
import type { Task } from '@/db/types';
import { careActions } from '@/lib/care-actions';
import { daysBetween, formatDue, formatInterval, formatRelativeTime, today } from '@/lib/dates';
import { taskTitle } from '@/lib/labels';
import { closeScreen } from '@/lib/navigation';
import { SOIL_WET_DEFAULT_DAYS } from '@/lib/schedule';
import { isDoneToday } from '@/lib/tasks';
import { capitalize } from '@/lib/text';
import { spacing, useTheme } from '@/theme';

const SNOOZE_OPTIONS = [
  { days: 1, label: 'Demain' },
  { days: 2, label: '2 jours' },
  { days: 3, label: '3 jours' },
  { days: 7, label: '1 semaine' },
];

/** Quick actions on a task, in a bottom sheet: done, snooze, soil still wet. */
export default function TaskSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTask(id);

  // Deleted meanwhile: close the sheet.
  useEffect(() => {
    if (!task) closeScreen();
  }, [task]);

  if (!task) return null;
  return <TaskActions task={task} />;
}

function TaskActions({ task }: { task: Task }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const plant = usePlant(task.plant_id);

  const day = today();
  const late = daysBetween(task.next_due_on, day);
  const doneToday = isDoneToday(task);

  const act = (action: () => void) => {
    action();
    closeScreen();
  };

  const acceptSuggestion = (days: number) =>
    updateTask(task.id, {
      kind: task.kind,
      label: task.label,
      interval_days: days,
      winter_factor: task.winter_factor,
    });

  const due =
    late > 0
      ? capitalize(formatDue(task.next_due_on, day))
      : late === 0
        ? 'À faire aujourd’hui'
        : `Prévu ${formatDue(task.next_due_on, day)}`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.surfaceContainerLow }}
      contentContainerStyle={{
        padding: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.xl,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
      }}>
      <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
        <TaskKindBadge task={task} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={2}>
            {taskTitle(task)}
          </Text>
          {plant && (
            <Text variant="body" tone="secondary" numberOfLines={1}>
              {plant.nickname}
            </Text>
          )}
        </View>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text
          variant="bodyStrong"
          color={late > 0 ? theme.error : late === 0 ? theme.warning : theme.text}>
          {due}
        </Text>
        <Text variant="subhead" tone="secondary">
          {capitalize(formatInterval(task.interval_days))}
          {task.winter_factor !== 1
            ? ` (×${String(task.winter_factor).replace('.', ',')} en hiver)`
            : ''}
        </Text>
        {task.last_done_at && (
          <Text variant="subhead" tone="secondary">
            Dernière fois {formatRelativeTime(task.last_done_at)}
          </Text>
        )}
      </View>

      {task.suggested_interval_days ? (
        <Banner
          tone="info"
          icon={icons.wet}
          title="Le terreau reste souvent humide"
          action={{
            label: `Passer à ${task.suggested_interval_days} jours`,
            onPress: () => acceptSuggestion(task.suggested_interval_days!),
          }}>
          {`Il l’était encore ${task.wet_streak} fois de suite. Espacer ce soin (${task.interval_days} jours aujourd’hui) ?`}
        </Banner>
      ) : null}

      {doneToday ? (
        <Banner tone="success" icon={icons.check}>
          Déjà fait aujourd’hui.
        </Banner>
      ) : (
        <Button
          title="C’est fait"
          icon={icons.check}
          onPress={() => act(() => careActions.complete(task.id))}
        />
      )}

      {task.kind === 'water' && !doneToday && (
        <Button
          title="Terreau encore humide"
          icon={icons.wet}
          variant="tonal"
          onPress={() => act(() => careActions.soilWet(task.id, SOIL_WET_DEFAULT_DAYS))}
          accessibilityHint={`Reporte l’arrosage de ${SOIL_WET_DEFAULT_DAYS} jours`}
        />
      )}

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          Reporter à
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {SNOOZE_OPTIONS.map((option) => (
            <Chip
              key={option.days}
              label={option.label}
              icon={icons.snooze}
              onPress={() => act(() => careActions.snooze(task.id, option.days))}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button
          title="Voir la plante"
          icon={icons.leaf}
          variant="text"
          onPress={() => router.dismissTo({ pathname: '/plant/[id]', params: { id: task.plant_id } })}
        />
        <Button
          title="Modifier"
          icon={icons.edit}
          variant="text"
          onPress={() => router.push({ pathname: '/task/[id]/edit', params: { id: task.id } })}
        />
      </View>
    </ScrollView>
  );
}
