import { Pressable, View } from 'react-native';

import type { Plant, Task } from '@/db/types';
import { Icon, icons, Text } from '@/components/ui';
import { daysBetween, formatDue, formatInterval, formatRelativeTime, today } from '@/lib/dates';
import { TASK_KINDS, taskTitle } from '@/lib/labels';
import { isDoneToday } from '@/lib/tasks';
import { capitalize } from '@/lib/text';
import { radius, spacing, touchTarget, useAccent, useTheme } from '@/theme';

import { PlantThumb } from './plant-thumb';

/** Round badge with the task kind's icon and color. */
export function TaskKindBadge({ task, size = 40 }: { task: Pick<Task, 'kind'>; size?: number }) {
  const kind = TASK_KINDS[task.kind];
  const accent = useAccent(kind.accent);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: accent.container,
      }}>
      <Icon name={kind.icon} size={Math.round(size * 0.5)} color={accent.content} />
    </View>
  );
}

type TaskRowProps = {
  task: Task;
  /** Show the plant (Today screen). Without it, the row describes the task itself. */
  plant?: Plant;
  roomName?: string | null;
  onPress: () => void;
  onComplete?: () => void;
};

export function TaskRow({ task, plant, roomName, onPress, onComplete }: TaskRowProps) {
  const theme = useTheme();
  const now = today();
  const overdueDays = daysBetween(task.next_due_on, now);
  const doneToday = isDoneToday(task);

  const title = plant ? plant.nickname : taskTitle(task);
  const subtitle = plant
    ? [taskTitle(task), roomName].filter(Boolean).join(' · ')
    : formatInterval(task.interval_days);

  let status: { text: string; color: string };
  if (doneToday) {
    status = {
      text: `Fait ${formatRelativeTime(task.last_done_at!)}`,
      color: theme.primary,
    };
  } else if (overdueDays > 0) {
    status = { text: capitalize(formatDue(task.next_due_on, now)), color: theme.error };
  } else if (overdueDays === 0) {
    status = { text: 'À faire aujourd’hui', color: theme.warning };
  } else {
    status = { text: capitalize(formatDue(task.next_due_on, now)), color: theme.textSecondary };
  }

  const label = `${title}, ${subtitle}. ${status.text}`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Ouvre les actions de la tâche"
        onPress={onPress}
        android_ripple={{ color: theme.outlineVariant }}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingLeft: spacing.lg,
          paddingRight: onComplete ? spacing.xs : spacing.lg,
          backgroundColor:
            process.env.EXPO_OS !== 'android' && pressed ? theme.surfaceContainerHigh : undefined,
        })}>
        {plant ? (
          <View>
            <PlantThumb uri={plant.main_photo_uri} size={52} />
            <View style={{ position: 'absolute', right: -6, bottom: -6 }}>
              <View style={{ borderRadius: radius.full, borderWidth: 2, borderColor: theme.surfaceContainerLow }}>
                <TaskKindBadge task={task} size={24} />
              </View>
            </View>
          </View>
        ) : (
          <TaskKindBadge task={task} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="subhead" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {doneToday && <Icon name={icons.check} size={14} color={status.color} />}
            <Text variant="caption" color={status.color} numberOfLines={1} style={{ flexShrink: 1 }}>
              {status.text}
            </Text>
          </View>
          {task.suggested_interval_days && !doneToday ? (
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              Terreau souvent humide : passer à {task.suggested_interval_days} j ?
            </Text>
          ) : null}
        </View>
      </Pressable>
      {onComplete && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={doneToday ? `${title} : déjà fait aujourd’hui` : `Marquer comme fait : ${taskTitle(task)}, ${title}`}
          disabled={doneToday}
          onPress={onComplete}
          hitSlop={4}
          android_ripple={{ color: theme.outlineVariant, borderless: true }}
          style={({ pressed }) => ({
            width: touchTarget,
            height: touchTarget,
            marginRight: spacing.sm,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: doneToday ? 0 : 2,
            borderColor: theme.primary,
            backgroundColor: doneToday ? theme.primaryContainer : 'transparent',
            opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.6 : 1,
          })}>
          <Icon
            name={icons.check}
            size={24}
            color={doneToday ? theme.onPrimaryContainer : theme.primary}
          />
        </Pressable>
      )}
    </View>
  );
}
