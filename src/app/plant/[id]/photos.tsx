import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Scene } from '@/components/scene';
import { EmptyState, HeaderButton, Icon, icons, Screen, Text } from '@/components/ui';
import { usePhotos, usePlant } from '@/db/hooks';
import type { Photo, Plant } from '@/db/types';
import { useAddPhoto } from '@/hooks/use-add-photo';
import { formatShortDate } from '@/lib/dates';
import { closeScreen } from '@/lib/navigation';
import { beforeAfter, groupByMonth, laterText, photoDay } from '@/lib/photos';
import { capitalize } from '@/lib/text';
import { radius, spacing, useTheme } from '@/theme';

/** Space between the grid's photos. */
const GAP = spacing.xs;

function openPhoto(photo: Photo) {
  router.push({ pathname: '/plant/[id]/photo/[photoId]', params: { id: photo.plant_id, photoId: photo.id } });
}

/** The growth gallery: every photo of a plant by month, and how it changed. */
export default function PlantPhotos() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlant(id);
  if (!plant) {
    return (
      <Screen>
        <EmptyState
          art={<Scene id="searching" />}
          title="Plante introuvable"
          message="Elle a peut-être été supprimée."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <Gallery plant={plant} />;
}

function Gallery({ plant }: { plant: Plant }) {
  const photos = usePhotos(plant.id);
  const { saving, add } = useAddPhoto(plant.id);
  const months = useMemo(() => groupByMonth(photos), [photos]);
  const pair = useMemo(() => beforeAfter(photos), [photos]);

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Ajouter" onPress={add} loading={saving} /> }}
      />
      <Screen>
        {photos.length === 0 ? (
          <EmptyState
            icon={icons.gallery}
            title="Pas encore de photo"
            message="Une photo de temps en temps, et tu verras ta plante grandir."
            action={{ label: 'Ajouter une photo', icon: icons.camera, onPress: add }}
          />
        ) : (
          <>
            {pair && <BeforeAfter before={pair.before} after={pair.after} />}
            {months.map((month) => (
              <View key={month.key} style={{ gap: spacing.sm }}>
                <Text
                  variant="overline"
                  tone="secondary"
                  accessibilityRole="header"
                  style={{ paddingHorizontal: spacing.xs }}>
                  {capitalize(month.title)}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -GAP / 2 }}>
                  {month.photos.map((photo) => (
                    <Tile key={photo.id} photo={photo} main={photo.id === plant.main_photo_id} />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </Screen>
    </>
  );
}

/** The oldest and newest photos of the plant side by side. */
function BeforeAfter({ before, after }: { before: Photo; after: Photo }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="overline" tone="secondary" accessibilityRole="header" style={{ paddingHorizontal: spacing.xs }}>
        Avant / maintenant
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ComparedPhoto photo={before} label="Avant" />
        <ComparedPhoto photo={after} label="Maintenant" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
        <Icon name={icons.schedule} size={16} />
        <Text variant="label" tone="secondary">
          {capitalize(laterText(photoDay(before), photoDay(after)))}
        </Text>
      </View>
    </View>
  );
}

function ComparedPhoto({ photo, label }: { photo: Photo; label: string }) {
  const theme = useTheme();
  const day = formatShortDate(photoDay(photo));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : photo du ${day}`}
      onPress={() => openPhoto(photo)}
      style={{ flex: 1, gap: spacing.xs }}>
      <Image
        source={{ uri: photo.uri }}
        contentFit="cover"
        transition={150}
        style={{
          width: '100%',
          aspectRatio: 3 / 4,
          borderRadius: radius.lg,
          backgroundColor: theme.surfaceContainerHigh,
        }}
      />
      <View style={{ paddingHorizontal: spacing.xs }}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" tone="secondary">
          {day}
        </Text>
      </View>
    </Pressable>
  );
}

/** A square of the grid: the main photo is outlined, diagnosis close-ups carry a badge. */
function Tile({ photo, main }: { photo: Photo; main: boolean }) {
  const theme = useTheme();
  const label = [
    `Photo du ${formatShortDate(photoDay(photo))}`,
    main && 'photo principale',
    photo.diagnosis_id && 'diagnostic',
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => openPhoto(photo)}
      style={{ width: '33.333%', padding: GAP / 2 }}>
      <Image
        source={{ uri: photo.uri }}
        recyclingKey={photo.id}
        contentFit="cover"
        transition={150}
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: radius.sm,
          borderWidth: main ? 3 : 0,
          borderColor: theme.primary,
          backgroundColor: theme.surfaceContainerHigh,
        }}
      />
      {photo.diagnosis_id && (
        <View
          style={{
            position: 'absolute',
            left: GAP / 2 + spacing.xs,
            bottom: GAP / 2 + spacing.xs,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xxs,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xxs,
            borderRadius: radius.full,
            backgroundColor: theme.secondaryContainer,
          }}>
          <Icon name={icons.diagnose} size={12} color={theme.onSecondaryContainer} />
          <Text variant="caption" color={theme.onSecondaryContainer}>
            Diagnostic
          </Text>
        </View>
      )}
    </Pressable>
  );
}
