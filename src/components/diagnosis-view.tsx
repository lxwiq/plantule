import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Fact } from '@/components/care-sheet-view';
import { PlantThumb } from '@/components/plant-thumb';
import { Icon, icons, ListRow, ListSection, Text, type IconName } from '@/components/ui';
import type { DiagnosisRecord } from '@/db/types';
import { formatRelativeDay, toDateString } from '@/lib/dates';
import {
  PROBLEM_KIND_LABELS,
  STATUS_LABELS,
  type Diagnosis,
  type DiagnosisProblem,
  type DiagnosisStatus,
  type LightChange,
  type ProblemKind,
  type WateringChange,
} from '@/lib/diagnosis';
import { confidenceLevel, confidenceText } from '@/lib/identification';
import { TASK_KINDS } from '@/lib/labels';
import { capitalize } from '@/lib/text';
import { radius, spacing, useTheme, type Palette } from '@/theme';

/** Goes with every diagnosis: the model only sees what the photo shows. */
export const DIAGNOSIS_DISCLAIMER =
  'Pistes à vérifier, pas un verdict : le modèle ne voit ni les racines ni les parasites trop petits pour la photo.';

const STATUS_ICONS: Record<DiagnosisStatus, IconName> = {
  healthy: icons.check,
  watch: icons.eye,
  treat: icons.problem,
};

function statusColors(status: DiagnosisStatus, theme: Palette) {
  switch (status) {
    case 'healthy':
      return { container: theme.primaryContainer, content: theme.onPrimaryContainer };
    case 'watch':
      return { container: theme.warningContainer, content: theme.onWarningContainer };
    case 'treat':
      return { container: theme.errorContainer, content: theme.onErrorContainer };
  }
}

const KIND_ICONS: Record<ProblemKind, IconName> = {
  disease: icons.problem,
  pest: icons.pest,
  care: icons.leaf,
  environment: icons.weather,
};

const WATERING_CHANGES: Record<Exclude<WateringChange, 'none'>, string> = {
  less: 'Arroser moins souvent',
  more: 'Arroser plus souvent',
};

const LIGHT_CHANGES: Record<Exclude<LightChange, 'none'>, string> = {
  more: 'Plus de lumière',
  less: 'Moins de lumière, ou moins de soleil direct',
};

/** "Aujourd’hui", "Hier", "Le 3 mars": the day a diagnosis was made. */
export function diagnosisDay(createdAt: string): string {
  return capitalize(formatRelativeDay(toDateString(new Date(createdAt))));
}

/** The status badge: its label and icon on its color (not color alone), with the summary. */
function Summary({ diagnosis }: { diagnosis: Diagnosis }) {
  const theme = useTheme();
  const colors = statusColors(diagnosis.status, theme);
  return (
    <View
      accessible
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.container,
      }}>
      <Icon name={STATUS_ICONS[diagnosis.status]} size={24} color={colors.content} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="heading" color={colors.content}>
          {STATUS_LABELS[diagnosis.status]}
        </Text>
        {diagnosis.summary.trim() ? (
          <Text variant="body" color={colors.content} selectable>
            {diagnosis.summary.trim()}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** A likely problem: how sure the model is, what points to it, what to do now. */
function Problem({ problem }: { problem: DiagnosisProblem }) {
  const theme = useTheme();
  // Neutral tones: a likely problem is no good news.
  const pill =
    confidenceLevel(problem.confidence) === 'low'
      ? { background: theme.surfaceContainerHighest, content: theme.textSecondary }
      : { background: theme.secondaryContainer, content: theme.onSecondaryContainer };
  const actions = problem.actions.map((action) => action.trim()).filter(Boolean);

  return (
    <View
      accessible
      style={{ flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Icon name={KIND_ICONS[problem.kind]} size={22} color={theme.textSecondary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="bodyStrong" selectable>
          {capitalize(problem.name.trim())}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="caption" tone="secondary">
            {PROBLEM_KIND_LABELS[problem.kind]}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xxs,
              borderRadius: radius.sm,
              backgroundColor: pill.background,
            }}>
            <Text variant="caption" color={pill.content}>
              {confidenceText(problem.confidence)}
            </Text>
          </View>
        </View>
        {problem.signs.trim() ? (
          <Text variant="subhead" tone="secondary" selectable>
            {capitalize(problem.signs.trim())}
          </Text>
        ) : null}
        {actions.length > 0 && (
          <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
            <Text variant="label">À faire</Text>
            {actions.map((action, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Icon name={icons.check} size={16} color={theme.primary} style={{ marginTop: 3 }} />
                <Text variant="subhead" style={{ flex: 1 }} selectable>
                  {capitalize(action)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

type DiagnosisSectionsProps = {
  diagnosis: Diagnosis;
  /** Under the care changes, e.g. the offer to change the watering interval. */
  careAction?: ReactNode;
};

/** Status and summary, the likely problems, the care changes it suggests, and the disclaimer. */
export function DiagnosisSections({ diagnosis, careAction }: DiagnosisSectionsProps) {
  const problems = diagnosis.problems.filter((problem) => problem.name.trim());
  const watering = diagnosis.watering_change !== 'none' ? WATERING_CHANGES[diagnosis.watering_change] : null;
  const light = diagnosis.light_change !== 'none' ? LIGHT_CHANGES[diagnosis.light_change] : null;

  return (
    <>
      <Summary diagnosis={diagnosis} />

      {problems.length > 0 && (
        <ListSection title={problems.length > 1 ? 'Pistes probables' : 'Piste probable'}>
          {problems.map((problem, index) => (
            <Problem key={index} problem={problem} />
          ))}
        </ListSection>
      )}

      {(watering || light) && (
        <ListSection title="À ajuster">
          {watering ? <Fact icon={TASK_KINDS.water.icon} label="Arrosage" value={watering} /> : null}
          {light ? <Fact icon={icons.light} label="Lumière" value={light} /> : null}
        </ListSection>
      )}
      {careAction}

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs }}>
        <Icon name={icons.info} size={16} style={{ marginTop: 1 }} />
        <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
          {DIAGNOSIS_DISCLAIMER}
        </Text>
      </View>
    </>
  );
}

/** The photo it was made from, with the status on its corner. */
function DiagnosisThumb({ record }: { record: DiagnosisRecord }) {
  const theme = useTheme();
  const colors = statusColors(record.status, theme);
  return (
    <View>
      <PlantThumb uri={record.photo_uri} size={48} />
      <View
        style={{
          position: 'absolute',
          right: -4,
          bottom: -4,
          width: 22,
          height: 22,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: theme.surfaceContainerLow,
          backgroundColor: colors.container,
        }}>
        <Icon name={STATUS_ICONS[record.status]} size={12} color={colors.content} />
      </View>
    </View>
  );
}

/** A past diagnosis in the plant's "Santé" list. */
export function DiagnosisRow({ record, onPress }: { record: DiagnosisRecord; onPress: () => void }) {
  const summary = record.data.summary.trim();
  return (
    <ListRow
      leading={<DiagnosisThumb record={record} />}
      title={STATUS_LABELS[record.status]}
      subtitle={summary ? `${diagnosisDay(record.created_at)} · ${summary}` : diagnosisDay(record.created_at)}
      chevron
      onPress={onPress}
    />
  );
}
