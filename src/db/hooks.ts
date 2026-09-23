import { useLiveQuery } from './live';
import * as repo from './repo';
import type { Place } from './types';

export function usePlaces() {
  return useLiveQuery('places', ['places'], repo.listPlaces);
}

export function useSettings() {
  return useLiveQuery('settings', ['settings'], repo.getSettings);
}

/** The place shown in the app. There is always one (created on first launch). */
export function useCurrentPlace(): Place {
  const places = usePlaces();
  const { current_place_id } = useSettings();
  const place = places.find((p) => p.id === current_place_id) ?? places[0];
  if (!place) throw new Error('No place: ensurePlace() must run at startup');
  return place;
}

export function selectPlace(placeId: string) {
  repo.updateSettings({ current_place_id: placeId });
}

export function useRooms(placeId: string) {
  return useLiveQuery(`rooms:${placeId}`, ['rooms'], () => repo.listRooms(placeId));
}

export function usePlants(placeId: string) {
  return useLiveQuery(`plants:${placeId}`, ['plants', 'photos'], () => repo.listPlants(placeId));
}

export function usePlant(plantId: string) {
  return useLiveQuery(`plant:${plantId}`, ['plants', 'photos'], () => repo.getPlant(plantId));
}

export function useTasks(placeId: string) {
  return useLiveQuery(`tasks:${placeId}`, ['tasks', 'plants'], () => repo.listTasks(placeId));
}

export function useTask(taskId: string) {
  return useLiveQuery(`task:${taskId}`, ['tasks'], () => repo.getTask(taskId));
}

export function usePhotos(plantId: string) {
  return useLiveQuery(`photos:${plantId}`, ['photos'], () => repo.listPhotos(plantId));
}

export function usePlantEvents(plantId: string) {
  return useLiveQuery(`events:${plantId}`, ['events'], () => repo.listPlantEvents(plantId));
}
