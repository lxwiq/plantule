import { View } from 'react-native';

import { PlantThumb } from '@/components/plant-thumb';
import { ListRow, ListSection, TextField } from '@/components/ui';
import type { Wish, WishInput } from '@/db/types';
import { findReference, referenceKey, searchReferences } from '@/lib/plant-reference';
import { capitalize } from '@/lib/text';
import { spacing } from '@/theme';

export type WishDraft = { species: string; note: string };

export function wishDraft(wish?: Wish | null): WishDraft {
  return { species: wish?.species ?? '', note: wish?.note ?? '' };
}

export function draftToWishInput(draft: WishDraft): WishInput {
  return { species: draft.species, note: draft.note || null };
}

type WishFieldsProps = {
  draft: WishDraft;
  onChange: (draft: WishDraft) => void;
  autoFocus?: boolean;
};

/**
 * The species, with suggestions from the reference base while typing, and a
 * note. Shared by the create and edit screens.
 */
export function WishFields({ draft, onChange, autoFocus }: WishFieldsProps) {
  const typed = referenceKey(draft.species);
  const matches = searchReferences(draft.species);
  // Nothing more to suggest once a suggestion is picked, or a name typed in full.
  const suggestions = matches.some((match) => referenceKey(match.name) === typed) ? [] : matches;
  const known = findReference(draft.species);

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <TextField
          label="Espèce"
          placeholder="Pilea, Calathea, Oiseau de paradis…"
          value={draft.species}
          onChangeText={(species) => onChange({ ...draft, species })}
          autoFocus={autoFocus}
          autoCapitalize="sentences"
          autoCorrect={false}
          maxLength={120}
          hint={
            known
              ? `Dans la base de référence : ${capitalize(known.common_names[0])} (${known.scientific_name}).`
              : undefined
          }
        />
        {suggestions.length > 0 && (
          <ListSection>
            {suggestions.map(({ plant, name }) => (
              <ListRow
                key={plant.id}
                leading={<PlantThumb species={plant.scientific_name} size={40} />}
                title={capitalize(name)}
                subtitle={
                  referenceKey(name) === referenceKey(plant.scientific_name)
                    ? plant.common_names[0]
                    : plant.scientific_name
                }
                onPress={() => onChange({ ...draft, species: capitalize(name) })}
              />
            ))}
          </ListSection>
        )}
      </View>
      <TextField
        label="Note (facultatif)"
        placeholder="Vue chez le fleuriste, bouture promise par Julie…"
        value={draft.note}
        onChangeText={(note) => onChange({ ...draft, note })}
        multiline
        maxLength={2000}
      />
    </View>
  );
}
