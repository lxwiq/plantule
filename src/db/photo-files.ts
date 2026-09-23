import { Directory, File, Paths } from 'expo-file-system';

export const photosDirectory = () => new Directory(Paths.document, 'photos');

/** Where the photo with this id is kept. */
export const photoFile = (photoId: string) => new File(photosDirectory(), `${photoId}.jpg`);

/** Copies a picked photo into the app's storage and returns its permanent URI. */
export async function storePhotoFile(sourceUri: string, photoId: string): Promise<string> {
  photosDirectory().create({ idempotent: true, intermediates: true });
  const target = photoFile(photoId);
  await new File(sourceUri).copy(target);
  return target.uri;
}

export function deletePhotoFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing file is fine: the row is what matters.
  }
}
