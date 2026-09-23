import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { EventRow } from '@/components/event-row';
import { TaskRow } from '@/components/task-row';
import {
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
import { usePhotos, usePlant, usePlantEvents, useRooms, useTasks } from '@/db/hooks';
import { addPhoto, deletePhoto, deletePlant, setMainPhoto } from '@/db/repo';
import type { Photo, Plant } from '@/db/types';
import { careActions } from '@/lib/care-actions';
import { formatShortDate } from '@/lib/dates';
import { closeScreen } from '@/lib/navigation';
import { choosePhotoSource, pickPhoto } from '@/lib/pick-photo';
import { byDueDate } from '@/lib/tasks';
import { radius, spacing, useTheme } from '@/theme';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

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
  const [savingPhoto, setSavingPhoto] = useState(false);

  const room = rooms.find((r) => r.id === plant.room_id);
  const plantTasks = useMemo(
    () => tasks.filter((t) => t.plant_id === plant.id).sort(byDueDate),
    [tasks, plant.id],
  );

  const choosePhoto = () =>
    choosePhotoSource((source) => {
      pickPhoto(source)
        .then(async (uri) => {
          if (!uri) return;
          setSavingPhoto(true);
          await addPhoto(plant.id, uri);
        })
        .catch((e) => Alert.alert('Photo', errorText(e)))
        .finally(() => setSavingPhoto(false));
    });

  const managePhoto = (photo: Photo) => {
    const isMain = photo.id === plant.main_photo_id;
    Alert.alert('Photo', undefined, [
      { text: 'Annuler', style: 'cancel' },
      ...(isMain ? [] : [{ text: 'Photo principale', onPress: () => setMainPhoto(plant.id, photo.id) }]),
      { text: 'Supprimer', style: 'destructive' as const, onPress: () => deletePhoto(photo) },
    ]);
  };

  const confirmDelete = () =>
    Alert.alert(`Supprimer ${plant.nickname} ?`, 'Ses soins, son journal et ses photos seront supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          closeScreen();
          deletePlant(plant.id);
        },
      },
    ]);

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
        {plant.main_photo_uri ? (
          <Image
            source={{ uri: plant.main_photo_uri }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Photo de ${plant.nickname}`}
            style={{
              width: '100%',
              aspectRatio: 4 / 3,
              borderRadius: radius.xl,
              backgroundColor: theme.surfaceContainerHigh,
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo"
            onPress={choosePhoto}
            android_ripple={{ color: theme.outlineVariant }}
            style={{
              aspectRatio: 2,
              borderRadius: radius.xl,
              borderCurve: 'continuous',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              backgroundColor: theme.primaryContainer,
            }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primary,
              }}>
              <Icon name={icons.camera} size={28} color={theme.onPrimary} />
            </View>
            <Text variant="label" color={theme.onPrimaryContainer}>
              {savingPhoto ? 'Enregistrement de la photo…' : 'Ajouter une photo'}
            </Text>
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
            <Button
              title="Ajouter"
              icon={icons.camera}
              variant="text"
              size="sm"
              loading={savingPhoto}
              onPress={choosePhoto}
            />
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
                  accessibilityLabel={`Photo du ${formatShortDate(photo.created_at.slice(0, 10))}`}
                  onPress={() => managePhoto(photo)}>
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

        {(details.length > 0 || plant.notes) && (
          <ListSection title="Infos">
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
