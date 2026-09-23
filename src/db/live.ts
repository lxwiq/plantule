/**
 * Minimal reactivity over SQLite: every write reports the tables it touched,
 * and hooks re-run their query when one of their tables changed. Queries are
 * synchronous and small (a household's plants), so screens never show a
 * loading state.
 */

import { useSyncExternalStore } from 'react';

export type Table = 'places' | 'rooms' | 'plants' | 'photos' | 'tasks' | 'events' | 'settings';

const versions = new Map<Table, number>();
const listeners = new Set<() => void>();
const cache = new Map<string, { version: string; data: unknown }>();

/** Marks tables as changed; hooks reading them re-render. */
export function notify(...tables: Table[]) {
  for (const table of tables) versions.set(table, (versions.get(table) ?? 0) + 1);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Runs `query` and returns its result, re-running it when `tables` change.
 * `key` must identify the query and its arguments (e.g. "plants:<placeId>").
 */
export function useLiveQuery<T>(key: string, tables: Table[], query: () => T): T {
  return useSyncExternalStore(subscribe, () => {
    const version = tables.map((t) => versions.get(t) ?? 0).join('.');
    const hit = cache.get(key);
    if (hit && hit.version === version) return hit.data as T;
    const data = query();
    cache.set(key, { version, data });
    return data;
  });
}
