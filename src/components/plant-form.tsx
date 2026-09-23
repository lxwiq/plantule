import { router } from 'expo-router';
import { View } from 'react-native';

import type { Plant, PlantInput, Room } from '@/db/types';
import { Button, ChoiceChips, DateField, icons, Text, TextField } from '@/components/ui';
import { today } from '@/lib/dates';
import { spacing } from '@/theme';

export type PlantDraft = {
  nickname: string;
  species: string;
  roomId: string | null;
  acquiredOn: string | null;
  pot: string;
  substrate: string;
  notes: string;
};

export function plantDraft(plant?: Plant | null, roomId?: string | null): PlantDraft {
  return {
    nickname: plant?.nickname ?? '',
    species: plant?.species ?? '',
    roomId: plant?.room_id ?? roomId ?? null,
    acquiredOn: plant?.acquired_on ?? null,
    pot: plant?.pot ?? '',
    substrate: plant?.substrate ?? '',
    notes: plant?.notes ?? '',
  };
}

export function draftToInput(draft: PlantDraft): PlantInput {
  return {
    nickname: draft.nickname,
    species: draft.species || null,
    room_id: draft.roomId,
    acquired_on: draft.acquiredOn,
    pot: draft.pot || null,
    substrate: draft.substrate || null,
    notes: draft.notes || null,
  };
}

type PlantFieldsProps = {
  draft: PlantDraft;
  onChange: (draft: PlantDraft) => void;
  rooms: Room[];
  autoFocus?: boolean;
};

/** The plant's details, shared by the create and edit screens. */
export function PlantFields({ draft, onChange, rooms, autoFocus }: PlantFieldsProps) {
  const set = <K extends keyof PlantDraft>(key: K) => (value: PlantDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <View style={{ gap: spacing.xl }}>
      <TextField
        label="Surnom"
        placeholder="Monstre, Fifi, le grand ficus…"
        value={draft.nickname}
        onChangeText={set('nickname')}
        autoFocus={autoFocus}
        autoCapitalize="sentences"
        maxLength={60}
      />
      <TextField
        label="Espèce (facultatif)"
        placeholder="Monstera deliciosa"
        value={draft.species}
        onChangeText={set('species')}
        autoCapitalize="sentences"
        maxLength={120}
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          Pièce
        </Text>
        <ChoiceChips
          options={[
            { value: '', label: 'Aucune' },
            ...rooms.map((room) => ({
              value: room.id,
              label: room.name,
              icon: room.is_outdoor ? icons.outdoor : undefined,
            })),
          ]}
          value={draft.roomId ?? ''}
          onChange={(value) => set('roomId')(value || null)}
        />
        <Button
          title="Nouvelle pièce"
          icon={icons.add}
          variant="text"
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => router.push('/room/new')}
        />
      </View>

      <DateField
        label="Arrivée à la maison (facultatif)"
        value={draft.acquiredOn}
        onChange={set('acquiredOn')}
        maximumDate={today()}
        optional
      />
      <TextField
        label="Pot (facultatif)"
        placeholder="Terre cuite, 20 cm"
        value={draft.pot}
        onChangeText={set('pot')}
        maxLength={120}
      />
      <TextField
        label="Substrat (facultatif)"
        placeholder="Terreau + billes d’argile"
        value={draft.substrate}
        onChangeText={set('substrate')}
        maxLength={120}
      />
      <TextField
        label="Notes (facultatif)"
        placeholder="N’aime pas les courants d’air…"
        value={draft.notes}
        onChangeText={set('notes')}
        multiline
        maxLength={2000}
      />
    </View>
  );
}
