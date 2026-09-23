import { useEffect, useState } from 'react';

import type { Town } from '@/lib/weather';
import { searchTowns } from '@/weather/open-meteo';

/** Pause after the last key before asking Open-Meteo. */
const DEBOUNCE_MS = 400;

export type TownSearch = {
  status: 'idle' | 'searching' | 'done' | 'error';
  /** The towns found for the name, or the previous ones while searching. */
  towns: Town[];
};

/** Towns matching what is typed, from 2 letters, once typing pauses. */
export function useTownSearch(query: string): TownSearch {
  const name = query.trim();
  const [result, setResult] = useState<{ name: string; towns: Town[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (name.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchTowns(name, controller.signal).then(
        (towns) => setResult({ name, towns, failed: false }),
        () => {
          if (!controller.signal.aborted) setResult({ name, towns: [], failed: true });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name]);

  if (name.length < 2) return { status: 'idle', towns: [] };
  if (result?.name !== name) return { status: 'searching', towns: result?.towns ?? [] };
  return { status: result.failed ? 'error' : 'done', towns: result.towns };
}
