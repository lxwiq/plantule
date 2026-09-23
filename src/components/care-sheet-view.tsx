import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon, icons, ListSection, Text, type IconName } from '@/components/ui';
import {
  formatCareInterval,
  HUMIDITY_LABELS,
  toxicityText,
  winterText,
  type CareSheet,
} from '@/lib/care-sheet';
import { LIGHT_LABELS, TASK_KINDS } from '@/lib/labels';
import { capitalize } from '@/lib/text';
import { spacing, touchTarget, useTheme } from '@/theme';

/** Goes with every sheet: the advice comes from a small model. */
export const SHEET_DISCLAIMER = 'Conseils indicatifs, générés sur ton téléphone.';

type FactProps = {
  icon: IconName;
  label: string;
  value: string;
  detail?: string;
  /** Draws attention, e.g. toxic for pets. */
  warn?: boolean;
};

function Fact({ icon, label, value, detail, warn = false }: FactProps) {
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
        <Text variant="body" tone={warn ? 'warning' : 'default'}>
          {value}
        </Text>
        {detail ? (
          <Text variant="subhead" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Tip({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Icon name={icons.leaf} size={18} color={theme.primary} style={{ marginTop: 3 }} />
      <Text variant="body" style={{ flex: 1 }} selectable>
        {text}
      </Text>
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

/** What a species needs, then the model's tips. */
export function CareSheetSections({
  sheet,
  title = 'Entretien',
  action,
  showNames = false,
  footer,
}: CareSheetSectionsProps) {
  const every = (days: number) => capitalize(formatCareInterval(days));
  const watering = [every(sheet.watering.interval_days), winterText(sheet.watering.winter_factor)]
    .filter(Boolean)
    .join(', ');
  const { cats, dogs } = sheet.toxicity;

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
        <Fact icon={icons.light} label="Lumière" value={LIGHT_LABELS[sheet.light]} />
        <Fact icon={TASK_KINDS.water.icon} label="Arrosage" value={watering} detail={sheet.watering.advice} />
        <Fact icon={icons.wet} label="Humidité de l’air" value={HUMIDITY_LABELS[sheet.humidity]} />
        <Fact
          icon={icons.temperature}
          label="Température"
          value={`Entre ${sheet.temperature.min_c} et ${sheet.temperature.max_c} °C`}
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
        <Fact icon={TASK_KINDS.repot.icon} label="Rempotage" value={every(sheet.repotting.interval_days)} />
      </ListSection>
      <ListSection title="Conseils" footer={footer}>
        {sheet.tips.map((tip, index) => (
          <Tip key={index} text={tip} />
        ))}
      </ListSection>
    </>
  );
}
