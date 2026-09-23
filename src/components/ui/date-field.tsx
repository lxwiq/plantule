import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { formatShortDate, parseDate, toDateString } from '@/lib/dates';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { IconButton } from './icon-button';
import { Icon, icons } from './icon';
import { Text } from './text';

type DateFieldProps = {
  label: string;
  /** "YYYY-MM-DD", or null when empty. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Allow clearing the date. */
  optional?: boolean;
  minimumDate?: string;
  maximumDate?: string;
  hint?: string;
};

/** A date shown like a text field; tapping it opens the system date picker. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Choisir une date',
  optional = false,
  minimumDate,
  maximumDate,
  hint,
}: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${value ? formatShortDate(value) : placeholder}`}
          onPress={() => setOpen(true)}
          android_ripple={{ color: theme.outlineVariant }}
          style={{
            flex: 1,
            minHeight: touchTarget + 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: theme.outline,
            overflow: 'hidden',
          }}>
          <Icon name={icons.calendar} size={20} />
          <Text variant="body" tone={value ? 'default' : 'tertiary'}>
            {value ? formatShortDate(value) : placeholder}
          </Text>
        </Pressable>
        {optional && value && (
          <IconButton icon={icons.close} label={`Effacer : ${label}`} onPress={() => onChange(null)} />
        )}
      </View>
      {hint && (
        <Text variant="caption" tone="secondary">
          {hint}
        </Text>
      )}
      {open && (
        <DateTimePicker
          value={value ? parseDate(value) : new Date()}
          mode="date"
          presentation="dialog"
          accentColor={theme.primary}
          locale="fr_FR"
          minimumDate={minimumDate ? parseDate(minimumDate) : undefined}
          maximumDate={maximumDate ? parseDate(maximumDate) : undefined}
          positiveButton={{ label: 'OK' }}
          negativeButton={{ label: 'Annuler' }}
          onValueChange={(_event, date) => {
            setOpen(false);
            onChange(toDateString(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </View>
  );
}
