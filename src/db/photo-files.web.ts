/**
 * The browser build is for development only: photos are kept inline as data
 * URLs, since there is no file system.
 */
export async function storePhotoFile(sourceUri: string): Promise<string> {
  const blob = await (await fetch(sourceUri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function deletePhotoFile() {}
