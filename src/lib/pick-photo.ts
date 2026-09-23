import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { exifTakenAt } from './photos';

/** Photos are resized before upload: plenty for a phone screen, light on mobile data. */
const MAX_SIDE = 1600;

export type PhotoSource = 'camera' | 'library';

/** A photo ready to keep, with when it was taken (an instant). */
export type PickedPhoto = { uri: string; takenAt: string };

async function resize(uri: string, width: number, height: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

async function launch(source: PhotoSource, exif: boolean): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("L'accès à l'appareil photo est refusé. Autorise-le dans les réglages du téléphone.");
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0];
}

/** Takes or picks a photo and returns a local JPEG, or null if cancelled. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  const asset = await launch(source, false);
  return asset && resize(asset.uri, asset.width, asset.height);
}

/**
 * Like `pickPhoto`, with when the photo was taken: from its EXIF data when it
 * comes from the gallery, else now.
 */
export async function pickDatedPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  const asset = await launch(source, source === 'library');
  if (!asset) return null;
  const takenAt = exifTakenAt(asset.exif) ?? new Date().toISOString();
  return { uri: await resize(asset.uri, asset.width, asset.height), takenAt };
}

/** Asks where the photo comes from. */
export function choosePhotoSource(onChoose: (source: PhotoSource) => void) {
  if (process.env.EXPO_OS === 'web') {
    onChoose('library');
    return;
  }
  Alert.alert('Ajouter une photo', undefined, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Galerie', onPress: () => onChoose('library') },
    { text: 'Appareil photo', onPress: () => onChoose('camera') },
  ]);
}
