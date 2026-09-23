import { View } from 'react-native';

import type { CareEvent } from '@/db/types';
import { Icon, icons, Text } from '@/components/ui';
import { formatRelativeTime } from '@/lib/dates';
import { TASK_KINDS } from '@/lib/labels';
import { radius, spacing, useAccent, useTheme } from '@/theme';

/** "Arrosage fait", "Arrosage reporté de 2 j"... */
export function describeEvent(event: CareEvent): string {
  const task = event.task_label?.trim() || TASK_KINDS[event.task_kind].label;
  switch (event.kind) {
    case 'done':
      return `${task} fait`;
    case 'snoozed':
      return `${task} reporté de ${event.postponed_days ?? 1} j`;
    case 'soil_wet':
      return `Terreau encore humide : ${task.toLowerCase()} reporté de ${event.postponed_days ?? 2} j`;
  }
}

export function EventRow({ event }: { event: CareEvent }) {
  const theme = useTheme();
  const accent = useAccent(TASK_KINDS[event.task_kind].accent);
  const icon =
    event.kind === 'done'
      ? TASK_KINDS[event.task_kind].icon
      : event.kind === 'snoozed'
        ? icons.snooze
        : icons.wet;
  const done = event.kind === 'done';

  return (
    <View
      accessible
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? accent.container : theme.surfaceContainerHigh,
        }}>
        <Icon name={icon} size={18} color={done ? accent.content : theme.textSecondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subhead">{describeEvent(event)}</Text>
        {event.note ? (
          <Text variant="subhead" tone="secondary" style={{ fontStyle: 'italic' }}>
            « {event.note} »
          </Text>
        ) : null}
        <Text variant="caption" tone="tertiary">
          {formatRelativeTime(event.occurred_at)}
        </Text>
      </View>
    </View>
  );
}
