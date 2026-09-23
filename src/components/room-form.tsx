import { View } from 'react-native';

import type { Light, Room, RoomInput } from '@/db/types';
import { ChoiceChips, ListSection, SwitchRow, Text, TextField } from '@/components/ui';
import { LIGHT_LABELS, LIGHT_ORDER } from '@/lib/labels';
import { spacing } from '@/theme';

export type RoomDraft = { name: string; light: Light | null; isOutdoor: boolean };

export function roomDraft(room?: Room | null): RoomDraft {
  return { name: room?.name ?? '', light: room?.light ?? null, isOutdoor: room?.is_outdoor ?? false };
}

export function roomInput(draft: RoomDraft): RoomInput {
  return { name: draft.name, light: draft.light, is_outdoor: draft.isOutdoor };
}

export function RoomFields({ draft, onChange }: { draft: RoomDraft; onChange: (draft: RoomDraft) => void }) {
  return (
    <View style={{ gap: spacing.xl }}>
      <TextField
        label="Nom"
        placeholder="Salon, chambre, balcon…"
        value={draft.name}
        onChangeText={(name) => onChange({ ...draft, name })}
        autoFocus={!draft.name}
        autoCapitalize="sentences"
        maxLength={60}
      />
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          Exposition
        </Text>
        <ChoiceChips
          options={[
            { value: '', label: 'Je ne sais pas' },
            ...LIGHT_ORDER.map((light) => ({ value: light, label: LIGHT_LABELS[light] })),
          ]}
          value={draft.light ?? ''}
          onChange={(value) => onChange({ ...draft, light: (value || null) as Light | null })}
        />
      </View>
      <ListSection>
        <SwitchRow
          label="En extérieur"
          description="Balcon, terrasse, jardin."
          value={draft.isOutdoor}
          onValueChange={(isOutdoor) => onChange({ ...draft, isOutdoor })}
        />
      </ListSection>
    </View>
  );
}
