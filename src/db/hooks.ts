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

/** Photos of a plant, most recently taken first, with the diagnosis each one illustrates. */
export function usePhotos(plantId: string) {
  return useLiveQuery(`photos:${plantId}`, ['photos', 'diagnoses'], () => repo.listPhotos(plantId));
}

export function usePlantEvents(plantId: string) {
  return useLiveQuery(`events:${plantId}`, ['events'], () => repo.listPlantEvents(plantId));
}

/** Journal of the place's plants between two days included, oldest first. */
export function usePlaceEvents(placeId: string, fromDay: string, toDay: string) {
  return useLiveQuery(`place_events:${placeId}:${fromDay}:${toDay}`, ['events', 'plants'], () =>
    repo.listPlaceEvents(placeId, fromDay, toDay),
  );
}

export function useSpeciesSheet(sheetId: string | null | undefined) {
  return useLiveQuery(`species_sheet:${sheetId ?? ''}`, ['species_sheets'], () =>
    sheetId ? repo.getSpeciesSheet(sheetId) : null,
  );
}

/** The stored sheet matching a species name, if any (see `findSpeciesSheet`). */
export function useSpeciesSheetMatch(name: string | null | undefined) {
  return useLiveQuery(`species_sheet_match:${name ?? ''}`, ['species_sheets'], () =>
    name ? repo.findSpeciesSheet(name) : null,
  );
}

/** Tasks of one plant, soonest first. */
export function usePlantTasks(plantId: string) {
  return useLiveQuery(`plant_tasks:${plantId}`, ['tasks'], () => repo.listPlantTasks(plantId));
}

/** Diagnoses of a plant, newest first, with their photo. */
export function useDiagnoses(plantId: string) {
  return useLiveQuery(`diagnoses:${plantId}`, ['diagnoses', 'photos'], () => repo.listDiagnoses(plantId));
}

export function useDiagnosis(diagnosisId: string) {
  return useLiveQuery(`diagnosis:${diagnosisId}`, ['diagnoses', 'photos'], () => repo.getDiagnosis(diagnosisId));
}

/** The plant's "Demande à Plantule" conversation, oldest first. */
export function useChatMessages(plantId: string) {
  return useLiveQuery(`chat_messages:${plantId}`, ['chat_messages'], () => repo.listChatMessages(plantId));
}
