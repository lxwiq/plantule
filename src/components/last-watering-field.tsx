import { useState } from 'react';
import { View } from 'react-native';

import { ChoiceChips, DateField, Text } from '@/components/ui';
import { addDays, today } from '@/lib/dates';
import { spacing } from '@/theme';

type Choice = 'unknown' | 'today' | 'yesterday' | 'dayBefore' | 'other';

const OPTIONS: { value: Choice; label: string }[] = [
  { value: 'unknown', label: 'Je ne sais pas' },
  { value: 'today', label: 'Aujourd’hui' },
  { value: 'yesterday', label: 'Hier' },
  { value: 'dayBefore', label: 'Avant-hier' },
  { value: 'other', label: 'Autre date' },
];

type LastWateringFieldProps = {
  /** "YYYY-MM-DD", or null when unknown. */
  value: string | null;
  onChange: (value: string | null) => void;
};

/** When a new plant was last watered, so its first reminder falls at the right time. */
export function LastWateringField({ value, onChange }: LastWateringFieldProps) {
  const day = today();
  const presets = { today: day, yesterday: addDays(day, -1), dayBefore: addDays(day, -2) };
  const [otherDate, setOtherDate] = useState(false);

  const choice: Choice = otherDate
    ? 'other'
    : value === null
      ? 'unknown'
      : ((Object.keys(presets) as (keyof typeof presets)[]).find((key) => presets[key] === value) ??
        'other');

  const choose = (next: Choice) => {
    setOtherDate(next === 'other');
    if (next === 'unknown') onChange(null);
    else if (next !== 'other') onChange(presets[next]);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="secondary">
        Dernier arrosage
      </Text>
      <ChoiceChips options={OPTIONS} value={choice} onChange={choose} />
      {choice === 'other' && (
        <DateField label="Date" value={value} onChange={onChange} maximumDate={day} />
      )}
    </View>
  );
}
