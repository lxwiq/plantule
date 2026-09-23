import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { PlantThumb } from '@/components/plant-thumb';
import {
  Banner,
  ChoiceChips,
  EmptyState,
  IconButton,
  icons,
  ListRow,
  ListSection,
  Screen,
  Text,
} from '@/components/ui';
import { useCutting, usePlant } from '@/db/hooks';
import { deleteCutting, findSpeciesSheet, setCuttingStatus } from '@/db/repo';
import type { Cutting, Plant } from '@/db/types';
import { speciesKey } from '@/lib/care-sheet';
import {
  canBecomePlant,
  CUTTING_METHODS,
  CUTTING_STATUS_ORDER,
  CUTTING_STATUSES,
  cuttingOriginNote,
  cuttingProgress,
  cuttingTitle,
} from '@/lib/cuttings';
import { formatShortDate, today } from '@/lib/dates';
import { closeScreen } from '@/lib/navigation';
import { radius, spacing, useTheme } from '@/theme';

export default function CuttingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cutting = useCutting(id);
  if (!cutting) {
    return (
      <Screen>
        <EmptyState
          icon={icons.propagation}
          title="Bouture introuvable"
          message="Elle a peut-être été supprimée."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <CuttingDetails cutting={cutting} />;
}

/**
 * « En faire une plante » : the new plant form, filled from the cutting: its
 * species and that species' sheet, the room of the plant it comes from, its
 * photo, and a note saying where it comes from.
 */
function makePlant(cutting: Cutting, parent: Plant | null) {
  const species = cutting.species ?? parent?.species ?? null;
  const key = (name: string | null | undefined) => speciesKey(name ?? '').toLowerCase();
  const sameAsParent = !!parent?.species && key(parent.species) === key(species);
  const sheetId =
    (sameAsParent ? parent.species_sheet_id : null) ?? (species ? findSpeciesSheet(species)?.id : null);
  router.push({
    pathname: '/plant/new',
    params: {
      cuttingId: cutting.id,
      // With a sheet, the plant is named after the species' common name.
      ...(sheetId ? { sheetId } : species ? { species, nickname: species } : {}),
      ...(parent?.room_id ? { roomId: parent.room_id } : {}),
      ...(cutting.photo_uri
        ? { photoUri: cutting.photo_uri, photoTakenAt: cutting.photo_taken_at ?? undefined }
        : {}),
      notes: cuttingOriginNote(cutting, parent?.nickname),
      acquiredOn: cutting.started_on,
    },
  });
}

function CuttingDetails({ cutting }: { cutting: Cutting }) {
  const theme = useTheme();
  const parent = usePlant(cutting.parent_plant_id ?? '');
  const plant = usePlant(cutting.plant_id ?? '');
  const title = cuttingTitle(cutting, parent?.nickname);
  // Named after its parent: the species goes under the title.
  const species = parent ? cutting.species : null;

  const openPlant = (id: string) => router.push({ pathname: '/plant/[id]', params: { id } });

  const confirmDelete = () =>
    Alert.alert(
      'Supprimer cette bouture ?',
      plant ? `${plant.nickname} reste dans tes plantes.` : undefined,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            closeScreen();
            deleteCutting(cutting.id);
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <IconButton
              icon={icons.edit}
              label="Modifier la bouture"
              onPress={() => router.push({ pathname: '/cutting/[id]/edit', params: { id: cutting.id } })}
            />
          ),
        }}
      />
      <Screen>
        {cutting.photo_uri && (
          <Image
            source={{ uri: cutting.photo_uri }}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Photo de la bouture"
            style={{
              width: '100%',
              aspectRatio: 4 / 3,
              borderRadius: radius.xl,
              backgroundColor: theme.surfaceContainerHigh,
            }}
          />
        )}

        <View style={{ gap: spacing.xs }}>
          <Text variant="title" selectable>
            {title}
          </Text>
          {species && (
            <Text variant="body" tone="secondary" selectable>
              {species}
            </Text>
          )}
          <Text variant="body" tone="secondary">
            {cuttingProgress(cutting, today())}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text
            variant="overline"
            tone="secondary"
            accessibilityRole="header"
            style={{ paddingHorizontal: spacing.xs }}>
            Où elle en est
          </Text>
          <ChoiceChips
            options={CUTTING_STATUS_ORDER.map((status) => ({ value: status, label: CUTTING_STATUSES[status] }))}
            value={cutting.status}
            onChange={(status) => setCuttingStatus(cutting.id, status)}
          />
        </View>

        {canBecomePlant(cutting) && (
          <Banner
            tone="success"
            icon={icons.leaf}
            title={cutting.status === 'rooted' ? 'Prête à rempoter ?' : 'Rempotée'}
            action={{ label: 'En faire une plante', onPress: () => makePlant(cutting, parent) }}>
            La plante est créée avec son espèce, sa fiche si ton téléphone l’a, sa photo et la pièce de sa plante
            mère. Elle garde le lien avec cette bouture.
          </Banner>
        )}

        {plant && (
          <ListSection title="Devenue une plante">
            <ListRow
              leading={<PlantThumb uri={plant.main_photo_uri} species={plant.species} size={48} />}
              title={plant.nickname}
              subtitle={plant.species}
              onPress={() => openPlant(plant.id)}
              chevron
            />
          </ListSection>
        )}

        <ListSection title="Infos">
          {parent ? (
            <ListRow
              leading={<PlantThumb uri={parent.main_photo_uri} species={parent.species} size={40} />}
              title={parent.nickname}
              subtitle="Plante mère"
              onPress={() => openPlant(parent.id)}
              chevron
            />
          ) : null}
          <ListRow title={formatShortDate(cutting.started_on)} subtitle="Commencée le" />
          <ListRow title={CUTTING_METHODS[cutting.method]?.label ?? cutting.method} subtitle="Méthode" />
          {cutting.notes ? <ListRow title={cutting.notes} subtitle="Notes" /> : null}
        </ListSection>

        <ListSection>
          <ListRow leading={icons.delete} title="Supprimer la bouture" destructive onPress={confirmDelete} />
        </ListSection>
      </Screen>
    </>
  );
}
