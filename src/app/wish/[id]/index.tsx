import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { Fact } from '@/components/care-sheet-view';
import {
  Button,
  EmptyState,
  IconButton,
  icons,
  ListRow,
  ListSection,
  Screen,
  Text,
} from '@/components/ui';
import { useSpeciesSheetMatch, useWish } from '@/db/hooks';
import { deleteWish, findSpeciesSheet } from '@/db/repo';
import type { Wish } from '@/db/types';
import { formatShortDate, toDateString } from '@/lib/dates';
import { TASK_KINDS } from '@/lib/labels';
import { closeScreen } from '@/lib/navigation';
import { findReference } from '@/lib/plant-reference';
import { capitalize } from '@/lib/text';
import { wishFacts } from '@/lib/wishes';
import { spacing } from '@/theme';

export default function WishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wish = useWish(id);
  if (!wish) {
    return (
      <Screen>
        <EmptyState
          icon={icons.star}
          title="Envie introuvable"
          message="Elle a peut-être été supprimée, ou tu l’as déjà."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <WishDetails wish={wish} />;
}

/** « Je l’ai ! » : the new plant form, filled with the species, and its sheet when the phone has one. */
function gotIt(wish: Wish) {
  const sheet = findSpeciesSheet(wish.species);
  const reference = findReference(wish.species);
  router.push({
    pathname: '/plant/new',
    params: {
      wishId: wish.id,
      nickname: wish.species,
      ...(sheet ? { sheetId: sheet.id } : { species: reference?.scientific_name ?? wish.species }),
    },
  });
}

function WishDetails({ wish }: { wish: Wish }) {
  const reference = findReference(wish.species);
  // A species outside the base may still have a sheet written by the model.
  const sheet = useSpeciesSheetMatch(reference ? null : wish.species);
  const figures = reference ?? sheet?.data ?? null;
  const facts = figures ? wishFacts(figures) : null;
  const scientificName = reference?.scientific_name ?? sheet?.scientific_name ?? null;

  const confirmDelete = () =>
    Alert.alert(`Retirer « ${wish.species} » de tes envies ?`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => {
          closeScreen();
          deleteWish(wish.id);
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <IconButton
              icon={icons.edit}
              label="Modifier l’envie"
              onPress={() => router.push({ pathname: '/wish/[id]/edit', params: { id: wish.id } })}
            />
          ),
        }}
      />
      <Screen>
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" selectable>
            {capitalize(wish.species)}
          </Text>
          {scientificName && scientificName.toLowerCase() !== wish.species.trim().toLowerCase() ? (
            <Text variant="body" tone="secondary" style={{ fontStyle: 'italic' }} selectable>
              {scientificName}
            </Text>
          ) : null}
          <Text variant="subhead" tone="secondary">
            {`Ajoutée le ${formatShortDate(toDateString(new Date(wish.created_at)))}`}
          </Text>
        </View>

        <Button title="Je l’ai !" icon={icons.check} onPress={() => gotIt(wish)} />

        {facts ? (
          <ListSection
            title="Pour te décider"
            footer={reference ? 'D’après la base de référence de Plantule.' : 'D’après la fiche espèce de ton téléphone.'}>
            <Fact icon={icons.light} label="Lumière" value={facts.light} />
            <Fact icon={TASK_KINDS.water.icon} label="Arrosage" value={facts.watering} />
            <Fact icon={icons.pets} label="Chats et chiens" value={facts.toxicity} warn={facts.toxic} />
          </ListSection>
        ) : (
          <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
            Cette espèce n’est pas dans la base de référence de Plantule : pas de conseils pour l’instant.
          </Text>
        )}

        {wish.note ? (
          <ListSection title="Note">
            <ListRow title={wish.note} />
          </ListSection>
        ) : null}

        <ListSection>
          <ListRow leading={icons.delete} title="Retirer de mes envies" destructive onPress={confirmDelete} />
        </ListSection>
      </Screen>
    </>
  );
}
