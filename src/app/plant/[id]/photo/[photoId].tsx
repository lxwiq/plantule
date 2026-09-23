import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Icon, icons, Screen, Text, type IconName } from '@/components/ui';
import { usePhotos, usePlant } from '@/db/hooks';
import { deletePhoto, setMainPhoto, setPhotoTakenAt } from '@/db/repo';
import type { Photo, Plant } from '@/db/types';
import { formatShortDate, toDateString } from '@/lib/dates';
import { closeScreen } from '@/lib/navigation';
import { photoDay, sinceArrivalText, withDay } from '@/lib/photos';
import { capitalize } from '@/lib/text';
import { palettes, spacing, touchTarget, useTheme } from '@/theme';

// Photos are shown on a dark background, whatever the phone's theme (see the root layout).
const dark = palettes.dark;

/** A plant's photos full screen, one at a time: swipe to go through them. */
export default function PhotoViewer() {
  const { id, photoId } = useLocalSearchParams<{ id: string; photoId: string }>();
  const plant = usePlant(id);
  const photos = usePhotos(id);
  if (!plant || photos.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Photo introuvable"
          message="Elle a peut-être été supprimée."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <Viewer plant={plant} photos={photos} initialId={photoId} />;
}

function Viewer({ plant, photos, initialId }: { plant: Plant; photos: Photo[]; initialId: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const list = useRef<FlatList<Photo>>(null);
  const [pickingDate, setPickingDate] = useState(false);

  // The photo shown, followed by id when a new date moves it in the list. Once
  // it is deleted, the one taking its place is shown.
  const [shown, setShown] = useState(() => ({
    id: initialId,
    index: Math.max(
      photos.findIndex((p) => p.id === initialId),
      0,
    ),
  }));
  const found = photos.findIndex((p) => p.id === shown.id);
  const index = found >= 0 ? found : Math.min(shown.index, photos.length - 1);
  if (index !== shown.index) setShown({ id: shown.id, index });
  const photo = photos[index];
  const day = photoDay(photo);
  const isMain = photo.id === plant.main_photo_id;
  const diagnosisId = photo.diagnosis_id;

  useEffect(() => {
    list.current?.scrollToIndex({ index, animated: false });
  }, [index]);

  const confirmDelete = () =>
    Alert.alert(
      'Supprimer la photo ?',
      diagnosisId ? 'Elle illustre un diagnostic, qui restera sans photo si tu la supprimes.' : undefined,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Then the next older photo shows, or the newer one when it was the oldest.
            const next = photos[index + 1] ?? photos[index - 1];
            if (next) setShown({ id: next.id, index: Math.min(index, photos.length - 2) });
            else closeScreen();
            deletePhoto(photo);
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen
        options={{
          title: plant.nickname,
          headerRight: () =>
            photos.length > 1 ? (
              <Text variant="label" color={dark.textSecondary} style={{ paddingHorizontal: spacing.md }}>
                {`${index + 1} / ${photos.length}`}
              </Text>
            ) : null,
        }}
      />
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: dark.background }}>
        <View style={{ flex: 1 }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          {height > 0 && (
            <FlatList
              ref={list}
              data={photos}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={index}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              onMomentumScrollEnd={(e) => {
                const i = Math.round(e.nativeEvent.contentOffset.x / width);
                if (photos[i]) setShown({ id: photos[i].id, index: i });
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.uri }}
                  recyclingKey={item.id}
                  contentFit="contain"
                  transition={150}
                  accessibilityLabel={`Photo du ${formatShortDate(photoDay(item))}`}
                  style={{ width, height }}
                />
              )}
            />
          )}
        </View>

        <View
          style={{
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.sm,
          }}>
          <View accessible style={{ gap: spacing.xxs, paddingHorizontal: spacing.xs }}>
            <Text variant="heading" color={dark.text}>
              {formatShortDate(day)}
            </Text>
            {plant.acquired_on ? (
              <Text variant="subhead" color={dark.textSecondary}>
                {capitalize(sinceArrivalText(plant.acquired_on, day))}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <ViewerAction
              icon={icons.star}
              label="Photo principale"
              active={isMain}
              onPress={() => setMainPhoto(plant.id, photo.id)}
            />
            <ViewerAction icon={icons.calendar} label="Changer la date" onPress={() => setPickingDate(true)} />
            {diagnosisId ? (
              <ViewerAction
                icon={icons.diagnose}
                label="Voir le diagnostic"
                onPress={() => router.push({ pathname: '/diagnosis/[id]', params: { id: diagnosisId } })}
              />
            ) : null}
            <ViewerAction icon={icons.delete} label="Supprimer" destructive onPress={confirmDelete} />
          </View>
        </View>
      </View>

      {pickingDate && (
        <DateTimePicker
          value={new Date(photo.taken_at)}
          mode="date"
          presentation="dialog"
          accentColor={theme.primary}
          locale="fr_FR"
          maximumDate={new Date()}
          positiveButton={{ label: 'OK' }}
          negativeButton={{ label: 'Annuler' }}
          onValueChange={(_event, date) => {
            setPickingDate(false);
            setPhotoTakenAt(photo.id, withDay(photo.taken_at, toDateString(date)));
          }}
          onDismiss={() => setPickingDate(false)}
        />
      )}
    </>
  );
}

type ViewerActionProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Already the case, e.g. the main photo: shown selected, not pressable. */
  active?: boolean;
  destructive?: boolean;
};

/** An icon above its label, on the dark background. */
function ViewerAction({ icon, label, onPress, active = false, destructive = false }: ViewerActionProps) {
  const color = destructive ? dark.error : active ? dark.primary : dark.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled: active }}
      disabled={active}
      onPress={onPress}
      android_ripple={{ color: dark.outlineVariant, borderless: true }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: touchTarget,
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.6 : 1,
      })}>
      <Icon name={icon} size={24} color={color} />
      <Text variant="caption" color={color} numberOfLines={2} style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}
