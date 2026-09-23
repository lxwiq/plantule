import { View } from 'react-native';

import type { Task, TaskInput, TaskKind } from '@/db/types';
import { ChoiceChips, DateField, Text, TextField } from '@/components/ui';
import { formatInterval, today } from '@/lib/dates';
import { TASK_KIND_ORDER, TASK_KINDS } from '@/lib/labels';
import { spacing } from '@/theme';

export type TaskDraft = {
  kind: TaskKind;
  label: string;
  /** Kept as text while typing. */
  interval: string;
  winterFactor: number;
  nextDueOn: string;
};

export function taskDraft(task?: Task | null): TaskDraft {
  const kind = task?.kind ?? 'water';
  return {
    kind,
    label: task?.label ?? '',
    interval: String(task?.interval_days ?? TASK_KINDS[kind].defaultInterval),
    winterFactor: task?.winter_factor ?? TASK_KINDS[kind].defaultWinterFactor,
    nextDueOn: task?.next_due_on ?? today(),
  };
}

export function intervalOf(draft: TaskDraft): number | null {
  const days = Number.parseInt(draft.interval, 10);
  return Number.isInteger(days) && days >= 1 && days <= 730 ? days : null;
}

export function draftIsValid(draft: TaskDraft) {
  return intervalOf(draft) !== null && (draft.kind !== 'other' || draft.label.trim().length > 0);
}

export function draftToInput(draft: TaskDraft): TaskInput {
  return {
    kind: draft.kind,
    label: draft.label.trim() || null,
    interval_days: intervalOf(draft) ?? 1,
    winter_factor: draft.winterFactor,
    next_due_on: draft.nextDueOn,
  };
}

const QUICK_INTERVALS = [1, 2, 3, 7, 14, 30];
const WINTER_FACTORS = [
  { value: 1, label: 'Pas de changement' },
  { value: 1.5, label: '×1,5' },
  { value: 2, label: '×2' },
  { value: 3, label: '×3' },
];

type TaskFieldsProps = {
  draft: TaskDraft;
  onChange: (draft: TaskDraft) => void;
  /** On creation, picking a kind also sets its usual interval. */
  applyKindDefaults?: boolean;
};

export function TaskFields({ draft, onChange, applyKindDefaults = false }: TaskFieldsProps) {
  const set = <K extends keyof TaskDraft>(key: K) => (value: TaskDraft[K]) =>
    onChange({ ...draft, [key]: value });
  const interval = intervalOf(draft);

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          Soin
        </Text>
        <ChoiceChips
          options={TASK_KIND_ORDER.map((kind) => ({
            value: kind,
            label: TASK_KINDS[kind].label,
            icon: TASK_KINDS[kind].icon,
          }))}
          value={draft.kind}
          onChange={(kind) =>
            onChange(
              applyKindDefaults
                ? {
                    ...draft,
                    kind,
                    interval: String(TASK_KINDS[kind].defaultInterval),
                    winterFactor: TASK_KINDS[kind].defaultWinterFactor,
                  }
                : { ...draft, kind },
            )
          }
        />
      </View>

      <TextField
        label={draft.kind === 'other' ? 'Nom du soin' : 'Nom du soin (facultatif)'}
        placeholder={draft.kind === 'other' ? 'Vérifier les cochenilles' : TASK_KINDS[draft.kind].verb}
        value={draft.label}
        onChangeText={set('label')}
        maxLength={60}
      />

      <View style={{ gap: spacing.sm }}>
        <TextField
          label="Tous les… (jours)"
          value={draft.interval}
          onChangeText={(value) => set('interval')(value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={3}
          hint={interval ? formatInterval(interval) : undefined}
          error={draft.interval && !interval ? 'Entre 1 et 730 jours.' : null}
        />
        <ChoiceChips
          scroll
          options={QUICK_INTERVALS.map((days) => ({ value: days, label: `${days} j` }))}
          value={interval}
          onChange={(days) => set('interval')(String(days))}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          En hiver (novembre à février)
        </Text>
        <ChoiceChips options={WINTER_FACTORS} value={draft.winterFactor} onChange={set('winterFactor')} />
        <Text variant="caption" tone="secondary">
          {draft.winterFactor === 1
            ? 'Même rythme toute l’année.'
            : interval
              ? `En hiver : ${formatInterval(Math.round(interval * draft.winterFactor))}.`
              : 'L’intervalle est allongé pendant le repos hivernal.'}
        </Text>
      </View>

      <DateField
        label="Prochaine fois"
        value={draft.nextDueOn}
        onChange={(value) => value && set('nextDueOn')(value)}
        hint="Ensuite, chaque fois compte à partir du jour où le soin est fait."
      />
    </View>
  );
}
