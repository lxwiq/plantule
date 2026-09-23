import { useMemo } from 'react';

import { DEFAULT_MASCOT_NAME, normalizeOutfit } from '@/art/pepin';
import { useSettings } from '@/db/hooks';

/** The mascot as the user made it: its name, and its outfit cleared of what the app doesn't know. */
export function useMascot() {
  const { mascot_name, mascot_outfit } = useSettings();
  const outfit = useMemo(() => normalizeOutfit(mascot_outfit), [mascot_outfit]);
  const name = (typeof mascot_name === 'string' && mascot_name.trim()) || DEFAULT_MASCOT_NAME;
  return { name, outfit };
}
