import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/** Photos are resized before upload: plenty for a phone screen, light on mobile data. */
const MAX_SIDE = 1600;

export type PhotoSource = 'camera' | 'library';

async function resize(uri: string, width: number, height: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Takes or picks a photo and returns a local JPEG, or null if cancelled. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("L'accès à l'appareil photo est refusé. Autorise-le dans les réglages du téléphone.");
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  return resize(asset.uri, asset.width, asset.height);
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
