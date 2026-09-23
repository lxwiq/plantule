import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon, icons, ListSection, Text, type IconName } from '@/components/ui';
import {
  HUMIDITY_LABELS,
  toxicityText,
  winterText,
  type CareProblem,
  type CareSheet,
} from '@/lib/care-sheet';
import { formatInterval } from '@/lib/dates';
import { LIGHT_LABELS, TASK_KINDS } from '@/lib/labels';
import { capitalize } from '@/lib/text';
import { spacing, touchTarget, useTheme } from '@/theme';

/** Goes with every sheet: the advice comes from a small model. */
export const SHEET_DISCLAIMER = 'Conseils indicatifs, générés sur ton téléphone.';

/** For a sheet whose figures come from the reference base (`reference_id` is set). */
export const SHEET_VERIFIED =
  'Lumière, arrosage, humidité, températures, toxicité, engrais et rempotage viennent de la base de référence de Plantule.';

/** For a sheet `isSheetComplete` rejects, usually written before these parts existed. */
export const SHEET_INCOMPLETE =
  'Des parties manquent : conseils de rempotage, substrat, pot conseillé, problèmes fréquents… Le modèle peut réécrire la fiche en entier, sur ton téléphone.';

type FactProps = {
  icon: IconName;
  label: string;
  value: string;
  detail?: string;
  /** Draws attention, e.g. toxic for pets. */
  warn?: boolean;
};

/** An icon, a small label, and what the sheet (or the photo) says. */
export function Fact({ icon, label, value, detail, warn = false }: FactProps) {
  const theme = useTheme();
  return (
    <View
      accessible
      style={{
        minHeight: touchTarget + 8,
        flexDirection: 'row',
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}>
      <Icon name={icon} size={22} color={warn ? theme.warning : theme.textSecondary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="caption" tone="secondary">
          {label}
        </Text>
        <Text variant="body" tone={warn ? 'warning' : 'default'} selectable>
          {value}
        </Text>
        {detail ? (
          <Text variant="subhead" tone="secondary" selectable>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** The sheet's figures come from the reference base, not from the model. */
function Verified() {
  const theme = useTheme();
  return (
    <View
      accessible
      style={{ flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Icon name={icons.verified} size={22} color={theme.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="bodyStrong" tone="primary">
          Données vérifiées
        </Text>
        <Text variant="subhead" tone="secondary">
          {SHEET_VERIFIED}
        </Text>
      </View>
    </View>
  );
}

function Tip({ text, icon = icons.leaf }: { text: string; icon?: IconName }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Icon name={icon} size={18} color={theme.primary} style={{ marginTop: 3 }} />
      <Text variant="body" style={{ flex: 1 }} selectable>
        {text}
      </Text>
    </View>
  );
}

/** Lowercase after a colon, unless it starts an acronym ("UV"). */
function afterColon(text: string) {
  return /^\p{Lu}\p{Ll}/u.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** "Cause : trop d’eau", the label standing out from the text. */
function Labelled({ label, text }: { label: string; text: string }) {
  return (
    <Text variant="subhead" tone="secondary" selectable>
      <Text variant="subhead" style={{ fontWeight: '600' }}>
        {label} :{' '}
      </Text>
      {afterColon(text.trim())}
    </Text>
  );
}

/** What you see, then why and what to do. */
function Problem({ problem }: { problem: CareProblem }) {
  const theme = useTheme();
  return (
    <View
      accessible
      style={{ flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Icon name={icons.problem} size={22} color={theme.textSecondary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="bodyStrong" selectable>
          {capitalize(problem.symptom)}
        </Text>
        {problem.cause ? <Labelled label="Cause" text={problem.cause} /> : null}
        {problem.fix ? <Labelled label="Solution" text={problem.fix} /> : null}
      </View>
    </View>
  );
}

/** Common name as a title, scientific name in italics under it. */
export function SpeciesNames({ sheet }: { sheet: Pick<CareSheet, 'common_name' | 'scientific_name'> }) {
  const sameName = sheet.common_name.toLowerCase() === sheet.scientific_name.toLowerCase();
  return (
    <View style={{ gap: spacing.xxs }}>
      <Text variant="title" selectable>
        {capitalize(sheet.common_name)}
      </Text>
      {!sameName && (
        <Text variant="body" tone="secondary" style={{ fontStyle: 'italic' }} selectable>
          {sheet.scientific_name}
        </Text>
      )}
    </View>
  );
}

type CareSheetSectionsProps = {
  sheet: CareSheet;
  title?: string;
  /** Right side of the title, e.g. a text button. */
  action?: ReactNode;
  /** Start with a row naming the species (when the screen does not already). */
  showNames?: boolean;
  footer?: string;
};

/**
 * What a species needs, then its pot, the model's tips, common problems and
 * cuttings. Parts a sheet does not have (older sheets) are left out.
 */
export function CareSheetSections({
  sheet,
  title = 'Entretien',
  action,
  showNames = false,
  footer,
}: CareSheetSectionsProps) {
  const every = (days: number) => capitalize(formatInterval(days));
  const watering = [every(sheet.watering.interval_days), winterText(sheet.watering.winter_factor)]
    .filter(Boolean)
    .join(', ');
  const { cats, dogs } = sheet.toxicity;
  const substrate = sheet.substrate.trim();
  const pot = sheet.pot.trim();
  const propagation = sheet.propagation.trim();
  const problems = sheet.problems.filter((problem) => problem.symptom.trim());
  // The disclaimer goes under the last section shown.
  const last = propagation ? 'propagation' : problems.length > 0 ? 'problems' : 'tips';

  return (
    <>
      <ListSection title={title} action={action}>
        {showNames ? (
          <Fact
            icon={icons.leaf}
            label="Espèce"
            value={capitalize(sheet.common_name)}
            detail={
              sheet.common_name.toLowerCase() === sheet.scientific_name.toLowerCase()
                ? undefined
                : sheet.scientific_name
            }
          />
        ) : null}
        {sheet.reference_id ? <Verified /> : null}
        <Fact icon={icons.light} label="Lumière" value={LIGHT_LABELS[sheet.light]} />
        <Fact icon={TASK_KINDS.water.icon} label="Arrosage" value={watering} detail={sheet.watering.advice} />
        <Fact icon={icons.wet} label="Humidité de l’air" value={HUMIDITY_LABELS[sheet.humidity]} />
        <Fact
          icon={icons.temperature}
          label="Température"
          value={`Entre ${sheet.temperature.min_c} et ${sheet.temperature.max_c} °C`}
        />
        <Fact
          icon={icons.pets}
          label="Chats et chiens"
          value={toxicityText(sheet.toxicity)}
          warn={cats === 'toxic' || dogs === 'toxic'}
        />
        <Fact
          icon={TASK_KINDS.fertilize.icon}
          label="Engrais"
          value={`${every(sheet.fertilizing.interval_days)}, au printemps et en été`}
        />
        <Fact
          icon={TASK_KINDS.mist.icon}
          label="Brumisation"
          value={sheet.misting ? every(sheet.misting.interval_days) : 'Pas nécessaire'}
        />
      </ListSection>

      <ListSection title="Pot et rempotage">
        <Fact
          icon={TASK_KINDS.repot.icon}
          label="Rempotage"
          value={every(sheet.repotting.interval_days)}
          detail={sheet.repotting.advice.trim() || undefined}
        />
        {substrate ? <Fact icon={icons.substrate} label="Substrat conseillé" value={substrate} /> : null}
        {pot ? <Fact icon={icons.pot} label="Pot conseillé" value={pot} /> : null}
      </ListSection>

      <ListSection title="Conseils" footer={last === 'tips' ? footer : undefined}>
        {sheet.tips.map((tip, index) => (
          <Tip key={index} text={tip} />
        ))}
      </ListSection>

      {problems.length > 0 && (
        <ListSection title="Problèmes fréquents" footer={last === 'problems' ? footer : undefined}>
          {problems.map((problem, index) => (
            <Problem key={index} problem={problem} />
          ))}
        </ListSection>
      )}

      {propagation ? (
        <ListSection title="Bouturage" footer={last === 'propagation' ? footer : undefined}>
          <Tip icon={icons.propagation} text={propagation} />
        </ListSection>
      ) : null}
    </>
  );
}
