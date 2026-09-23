import { Directory, File, Paths } from 'expo-file-system';

const photosDir = () => new Directory(Paths.document, 'photos');

/** Copies a picked photo into the app's storage and returns its permanent URI. */
export async function storePhotoFile(sourceUri: string, photoId: string): Promise<string> {
  const dir = photosDir();
  dir.create({ idempotent: true, intermediates: true });
  const target = new File(dir, `${photoId}.jpg`);
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
