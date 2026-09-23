import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { useModelStatus } from '@/ai';
import { PlantArt } from '@/components/art';
import { CareSheetSections, SHEET_DISCLAIMER, SHEET_INCOMPLETE } from '@/components/care-sheet-view';
import { plainAnswer } from '@/components/chat-view';
import { DiagnosisRow } from '@/components/diagnosis-view';
import { EventRow } from '@/components/event-row';
import { TaskRow } from '@/components/task-row';
import {
  Banner,
  Button,
  EmptyState,
  Icon,
  IconButton,
  icons,
  ListRow,
  ListSection,
  Screen,
  Text,
} from '@/components/ui';
import {
  useChatMessages,
  useDiagnoses,
  usePhotos,
  usePlant,
  usePlantCutting,
  usePlantEvents,
  useRooms,
  useSpeciesSheet,
  useSpeciesSheetMatch,
  useTasks,
} from '@/db/hooks';
import { deletePlant, setPlantSpeciesSheet } from '@/db/repo';
import type { Plant } from '@/db/types';
import { useAddPhoto } from '@/hooks/use-add-photo';
import { careActions } from '@/lib/care-actions';
import { isSheetComplete } from '@/lib/care-sheet';
import { cuttingTitle } from '@/lib/cuttings';
import { formatShortDate } from '@/lib/dates';
import { closeScreen } from '@/lib/navigation';
import { photoDay } from '@/lib/photos';
import { plantMood } from '@/lib/plant-mood';
import { byDueDate } from '@/lib/tasks';
import { radius, spacing, useTheme } from '@/theme';

export default function PlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlant(id);
  if (!plant) {
    return (
      <Screen>
        <EmptyState
          title="Plante introuvable"
          message="Elle a peut-être été supprimée."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <PlantDetails plant={plant} />;
}

function PlantDetails({ plant }: { plant: Plant }) {
  const theme = useTheme();
  const rooms = useRooms(plant.place_id);
  const tasks = useTasks(plant.place_id);
  const events = usePlantEvents(plant.id);
  const photos = usePhotos(plant.id);
  const { saving: savingPhoto, add: choosePhoto } = useAddPhoto(plant.id);
  const mainPhotoId = plant.main_photo_id;
  // The cutting it grew from, and the plant that cutting was taken from.
  const cutting = usePlantCutting(plant.id);
  const cuttingParent = usePlant(cutting?.parent_plant_id ?? '');

  const room = rooms.find((r) => r.id === plant.room_id);
  const plantTasks = useMemo(
    () => tasks.filter((t) => t.plant_id === plant.id).sort(byDueDate),
    [tasks, plant.id],
  );
  // Newest first; the latest sets the mood of the drawing.
  const diagnoses = useDiagnoses(plant.id);

  const openPhoto = (photoId: string) =>
    router.push({ pathname: '/plant/[id]/photo/[photoId]', params: { id: plant.id, photoId } });

  const confirmDelete = () =>
    Alert.alert(
      `Supprimer ${plant.nickname} ?`,
      'Ses soins, son journal, ses photos, ses diagnostics et sa conversation seront supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            closeScreen();
            deletePlant(plant.id);
          },
        },
      ],
    );

  const details = [
    plant.acquired_on && { label: 'Arrivée', value: formatShortDate(plant.acquired_on) },
    plant.pot && { label: 'Pot', value: plant.pot },
    plant.substrate && { label: 'Substrat', value: plant.substrate },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <Stack.Screen
        options={{
          title: plant.nickname,
          headerRight: () => (
            <IconButton
              icon={icons.edit}
              label="Modifier la plante"
              onPress={() => router.push({ pathname: '/plant/[id]/edit', params: { id: plant.id } })}
            />
          ),
        }}
      />
      <Screen>
        {plant.main_photo_uri && mainPhotoId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Photo de ${plant.nickname}`}
            accessibilityHint="Ouvre la photo en grand"
            onPress={() => openPhoto(mainPhotoId)}>
            <Image
              source={{ uri: plant.main_photo_uri }}
              contentFit="cover"
              transition={200}
              style={{
                width: '100%',
                aspectRatio: 4 / 3,
                borderRadius: radius.xl,
                backgroundColor: theme.surfaceContainerHigh,
              }}
            />
          </Pressable>
        ) : (
          // No photo yet: the drawing of its species, in its mood, and a way to add one.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo"
            onPress={choosePhoto}
            android_ripple={{ color: theme.outlineVariant }}
            style={{
              borderRadius: radius.xl,
              borderCurve: 'continuous',
              overflow: 'hidden',
              alignItems: 'center',
              gap: spacing.xs,
              paddingTop: spacing.sm,
              paddingBottom: spacing.lg,
              backgroundColor: theme.primaryContainer,
            }}>
            <PlantArt species={plant.species} mood={plantMood(plantTasks, diagnoses[0])} size={200} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: 36,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.full,
                backgroundColor: theme.primary,
              }}>
              <Icon name={icons.camera} size={18} color={theme.onPrimary} />
              <Text variant="label" color={theme.onPrimary}>
                {savingPhoto ? 'Enregistrement de la photo…' : 'Ajouter une photo'}
              </Text>
            </View>
          </Pressable>
        )}

        <View style={{ gap: spacing.xs }}>
          <Text variant="title" selectable>
            {plant.nickname}
          </Text>
          {(plant.species || room) && (
            <Text variant="body" tone="secondary">
              {[plant.species, room?.name].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>

        <AskEntry plant={plant} />

        <ListSection
          title="Soins"
          action={
            <Button
              title="Ajouter"
              icon={icons.add}
              variant="text"
              size="sm"
              onPress={() => router.push({ pathname: '/task/new', params: { plantId: plant.id } })}
            />
          }
          footer={
            plantTasks.length === 0
              ? 'Aucun soin régulier. Ajoute un arrosage, de l’engrais, une brumisation…'
              : undefined
          }>
          {plantTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
              onComplete={() => careActions.complete(task.id)}
            />
          ))}
        </ListSection>

        <HealthSection plant={plant} />

        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.xs,
            }}>
            <Text variant="overline" tone="secondary" accessibilityRole="header">
              Photos
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {photos.length > 0 && (
                <Button
                  title="Tout voir"
                  variant="text"
                  size="sm"
                  onPress={() => router.push({ pathname: '/plant/[id]/photos', params: { id: plant.id } })}
                />
              )}
              <Button
                title="Ajouter"
                icon={icons.camera}
                variant="text"
                size="sm"
                loading={savingPhoto}
                onPress={choosePhoto}
              />
            </View>
          </View>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Photo du ${formatShortDate(photoDay(photo))}`}
                  accessibilityHint="Ouvre la photo en grand"
                  onPress={() => openPhoto(photo.id)}>
                  <Image
                    source={{ uri: photo.uri }}
                    contentFit="cover"
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: radius.md,
                      borderWidth: photo.id === plant.main_photo_id ? 3 : 0,
                      borderColor: theme.primary,
                      backgroundColor: theme.surfaceContainerHigh,
                    }}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
              Pas encore de photo.
            </Text>
          )}
        </View>

        <SpeciesSheetSection plant={plant} />

        {(details.length > 0 || plant.notes || cutting) && (
          <ListSection title="Infos">
            {cutting ? (
              <ListRow
                leading={icons.propagation}
                title={cuttingTitle(cutting, cuttingParent?.nickname)}
                subtitle="Origine"
                onPress={() => router.push({ pathname: '/cutting/[id]', params: { id: cutting.id } })}
                chevron
              />
            ) : null}
            {details.map((d) => (
              <ListRow key={d.label} title={d.value} subtitle={d.label} />
            ))}
            {plant.notes ? <ListRow title={plant.notes} subtitle="Notes" /> : null}
          </ListSection>
        )}

        <ListSection
          title="Journal"
          footer={
            events.length === 0
              ? 'Rien pour l’instant. Chaque soin fait ou reporté apparaîtra ici.'
              : undefined
          }>
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ListSection>

        <ListSection>
          <ListRow leading={icons.delete} title="Supprimer la plante" destructive onPress={confirmDelete} />
        </ListSection>
      </Screen>
    </>
  );
}

/** Opens the "Demande à Plantule" conversation, with its last message when there is one. */
function AskEntry({ plant }: { plant: Plant }) {
  const theme = useTheme();
  const status = useModelStatus();
  const messages = useChatMessages(plant.id);
  const last = messages.at(-1);
  // Nothing to offer on a phone that cannot run the model, unless there is a conversation to read.
  if (status.state === 'unsupported' && !last) return null;
  return (
    <ListSection>
      <ListRow
        leading={
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primaryContainer,
            }}>
            <Icon name={icons.chat} size={22} color={theme.onPrimaryContainer} />
          </View>
        }
        title="Demande à Plantule"
        subtitle={
          last
            ? `${last.role === 'user' ? 'Toi' : 'Plantule'} : ${plainAnswer(last.text).replace(/\s+/g, ' ')}`
            : `Une question sur ${plant.nickname} ? Arrosage, feuilles, rempotage…`
        }
        chevron
        onPress={() => router.push({ pathname: '/plant/[id]/ask', params: { id: plant.id } })}
      />
    </ListSection>
  );
}

/** Past diagnoses, and a new one when the model is ready. */
function HealthSection({ plant }: { plant: Plant }) {
  const status = useModelStatus();
  const diagnoses = useDiagnoses(plant.id);
  const ready = status.state === 'ready';
  if (!ready && diagnoses.length === 0) return null;
  return (
    <ListSection
      title="Santé"
      action={
        ready ? (
          <Button
            title="Diagnostiquer"
            icon={icons.diagnose}
            variant="text"
            size="sm"
            onPress={() => router.push({ pathname: '/plant/[id]/diagnose', params: { id: plant.id } })}
          />
        ) : undefined
      }
      footer={
        diagnoses.length === 0
          ? 'Une feuille qui jaunit, des taches ? Photographie-la de près : le modèle te propose des pistes.'
          : undefined
      }>
      {diagnoses.map((record) => (
        <DiagnosisRow
          key={record.id}
          record={record}
          onPress={() => router.push({ pathname: '/diagnosis/[id]', params: { id: record.id } })}
        />
      ))}
    </ListSection>
  );
}

/** The plant's species sheet, or a way to get one when its species is known. */
function SpeciesSheetSection({ plant }: { plant: Plant }) {
  const status = useModelStatus();
  const sheet = useSpeciesSheet(plant.species_sheet_id);
  // A sheet already on the phone for this species: no need for the model.
  const match = useSpeciesSheetMatch(sheet ? null : plant.species);

  if (sheet) {
    const confirmRemove = () =>
      Alert.alert('Retirer la fiche espèce ?', 'Elle reste sur ton téléphone pour les autres plantes.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Retirer', style: 'destructive', onPress: () => setPlantSpeciesSheet(plant.id, null) },
      ]);
    // Older sheets lack the substrate, pot, problems…: the model can write them again.
    const canComplete = !isSheetComplete(sheet.data) && status.state === 'ready';
    return (
      <>
        {canComplete && (
          <Banner
            icon={icons.sparkles}
            title="Fiche à compléter"
            action={{
              label: 'Compléter la fiche',
              onPress: () =>
                router.push({
                  pathname: '/scan/sheet',
                  params: {
                    species: sheet.data.scientific_name,
                    commonName: sheet.data.common_name,
                    plantId: plant.id,
                    refresh: '1',
                  },
                }),
            }}>
            {SHEET_INCOMPLETE}
          </Banner>
        )}
        <CareSheetSections
          sheet={sheet.data}
          title="Fiche espèce"
          showNames
          footer={SHEET_DISCLAIMER}
          action={<Button title="Retirer" variant="text" size="sm" onPress={confirmRemove} />}
        />
      </>
    );
  }

  const species = plant.species;
  if (!species) return null;
  if (match) {
    return (
      <Banner
        icon={icons.sparkles}
        title="Fiche espèce"
        action={{ label: 'Ajouter la fiche', onPress: () => setPlantSpeciesSheet(plant.id, match.id) }}>
        {`La fiche « ${match.common_name} » est déjà sur ton téléphone : lumière, arrosage, toxicité…`}
      </Banner>
    );
  }
  if (status.state !== 'ready') return null;
  return (
    <Banner
      icon={icons.sparkles}
      title="Fiche espèce"
      action={{
        label: 'Générer la fiche',
        onPress: () =>
          router.push({ pathname: '/scan/sheet', params: { species, plantId: plant.id } }),
      }}>
      Lumière, arrosage, toxicité pour les animaux… rédigés par le modèle, sur ton téléphone.
    </Banner>
  );
}
