import { Image } from 'expo-image';
import { Alert, View } from 'react-native';

import { Button, ChoiceChips, DateField, IconButton, icons, Text, TextField } from '@/components/ui';
import type { Cutting, CuttingInput, CuttingMethod, Plant } from '@/db/types';
import { CUTTING_METHOD_ORDER, CUTTING_METHODS } from '@/lib/cuttings';
import { today } from '@/lib/dates';
import { choosePhotoSource, pickDatedPhoto } from '@/lib/pick-photo';
import { radius, spacing } from '@/theme';

/** A photo picked for the form, or the one the cutting already has. */
export type DraftPhoto = { uri: string; takenAt?: string };

export type CuttingDraft = {
  parentId: string | null;
  species: string;
  startedOn: string;
  method: CuttingMethod;
  notes: string;
  photo: DraftPhoto | null;
};

export function cuttingDraft(cutting?: Cutting | null, parent?: Plant | null): CuttingDraft {
  return {
    parentId: cutting ? cutting.parent_plant_id : (parent?.id ?? null),
    species: cutting ? (cutting.species ?? '') : (parent?.species ?? ''),
    startedOn: cutting?.started_on ?? today(),
    method: cutting?.method ?? 'water',
    notes: cutting?.notes ?? '',
    photo: cutting?.photo_uri ? { uri: cutting.photo_uri } : null,
  };
}

export function draftToCuttingInput(draft: CuttingDraft): CuttingInput {
  return {
    parent_plant_id: draft.parentId,
    species: draft.species || null,
    started_on: draft.startedOn,
    method: draft.method,
    notes: draft.notes || null,
  };
}

type CuttingFieldsProps = {
  draft: CuttingDraft;
  onChange: (draft: CuttingDraft) => void;
  /** The plants of the place, to pick the one it was taken from. */
  plants: Plant[];
};

/** The cutting's details, shared by the create and edit screens. */
export function CuttingFields({ draft, onChange, plants }: CuttingFieldsProps) {
  const set = <K extends keyof CuttingDraft>(key: K) => (value: CuttingDraft[K]) =>
    onChange({ ...draft, [key]: value });

  // The species follows the plant it comes from, unless it was typed.
  const chooseParent = (id: string) => {
    const before = plants.find((p) => p.id === draft.parentId)?.species ?? '';
    const parent = plants.find((p) => p.id === id);
    const followed = !draft.species.trim() || draft.species === before;
    onChange({
      ...draft,
      parentId: parent?.id ?? null,
      species: followed ? (parent?.species ?? '') : draft.species,
    });
  };

  const choosePhoto = () =>
    choosePhotoSource((source) => {
      pickDatedPhoto(source).then(
        (picked) => picked && set('photo')(picked),
        (e) => Alert.alert('Photo', e instanceof Error ? e.message : 'Une erreur est survenue.'),
      );
    });

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        {draft.photo ? (
          <>
            <Image
              source={{ uri: draft.photo.uri }}
              style={{ width: 96, height: 96, borderRadius: radius.lg }}
              contentFit="cover"
              accessibilityLabel="Photo de la bouture"
            />
            <Button title="Changer" variant="tonal" size="sm" onPress={choosePhoto} />
            <IconButton icon={icons.delete} label="Retirer la photo" onPress={() => set('photo')(null)} />
          </>
        ) : (
          <Button title="Ajouter une photo" icon={icons.camera} variant="tonal" onPress={choosePhoto} />
        )}
      </View>

      {plants.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="secondary">
            Plante mère
          </Text>
          <ChoiceChips
            scroll
            options={[
              { value: '', label: 'Aucune' },
              ...plants.map((plant) => ({ value: plant.id, label: plant.nickname })),
            ]}
            value={draft.parentId ?? ''}
            onChange={chooseParent}
          />
        </View>
      )}

      <TextField
        label="Espèce (facultatif)"
        placeholder="Pothos, Monstera…"
        value={draft.species}
        onChangeText={set('species')}
        autoCapitalize="sentences"
        maxLength={120}
      />

      <DateField
        label="Commencée le"
        value={draft.startedOn}
        onChange={(day) => day && set('startedOn')(day)}
        maximumDate={today()}
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          Méthode
        </Text>
        <ChoiceChips
          options={CUTTING_METHOD_ORDER.map((method) => ({ value: method, label: CUTTING_METHODS[method].label }))}
          value={draft.method}
          onChange={set('method')}
        />
      </View>

      <TextField
        label="Notes (facultatif)"
        placeholder="Coupée sous un nœud, deux feuilles…"
        value={draft.notes}
        onChangeText={set('notes')}
        multiline
        maxLength={2000}
      />
    </View>
  );
}
