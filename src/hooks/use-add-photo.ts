import { useState } from 'react';
import { Alert } from 'react-native';

import { addPhoto } from '@/db/repo';
import { choosePhotoSource, pickDatedPhoto } from '@/lib/pick-photo';

/**
 * Takes or picks a photo of a plant and keeps it, dated from the gallery
 * photo when there is a date. `saving` while it is copied.
 */
export function useAddPhoto(plantId: string) {
  const [saving, setSaving] = useState(false);
  const add = () =>
    choosePhotoSource((source) => {
      pickDatedPhoto(source)
        .then(async (photo) => {
          if (!photo) return;
          setSaving(true);
          await addPhoto(plantId, photo.uri, { takenAt: photo.takenAt });
        })
        .catch((e) => Alert.alert('Photo', e instanceof Error ? e.message : 'Une erreur est survenue.'))
        .finally(() => setSaving(false));
    });
  return { saving, add };
}
