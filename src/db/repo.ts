/**
 * All reads and writes of the local database. Writes report the tables they
 * change (see live.ts) so screens refresh on their own.
 */

import { randomUUID } from 'expo-crypto';

import { speciesKey, validateCareSheet, type CareSheet } from '@/lib/care-sheet';
import { parseDate, toDateString, today } from '@/lib/dates';
import { firstDueOn, nextDueAfterDone, postpone, suggestedInterval } from '@/lib/schedule';

import { database as db } from './database';
import { notify } from './live';
import { deletePhotoFile, storePhotoFile } from './photo-files';
import type {
  CareEvent,
  EventKind,
  Photo,
  Place,
  Plant,
  PlantInput,
  Room,
  RoomInput,
  Settings,
  SpeciesSheet,
  SpeciesSheetSource,
  Task,
  TaskInput,
} from './types';

const now = () => new Date().toISOString();
const clean = (value: string | null | undefined) => value?.trim() || null;

// Places

export function listPlaces(): Place[] {
  return db().getAllSync<Place>('select * from places order by created_at');
}

export function createPlace(name: string): Place {
  const place: Place = { id: randomUUID(), name: name.trim(), created_at: now() };
  db().runSync('insert into places (id, name, created_at) values (?, ?, ?)', place.id, place.name, place.created_at);
  notify('places');
  return place;
}

export function renamePlace(id: string, name: string) {
  db().runSync('update places set name = ? where id = ?', name.trim(), id);
  notify('places');
}

/** Deletes a place with its rooms, plants, tasks, journal and photos. */
export function deletePlace(id: string) {
  const files = db().getAllSync<{ uri: string }>(
    'select ph.uri from photos ph join plants p on p.id = ph.plant_id where p.place_id = ?',
    id,
  );
  db().runSync('delete from places where id = ?', id);
  files.forEach((f) => deletePhotoFile(f.uri));
  notify('places', 'rooms', 'plants', 'photos', 'tasks', 'events');
}

// Settings

const DEFAULT_SETTINGS: Settings = {
  current_place_id: null,
  daily_summary_enabled: true,
  daily_summary_time: '08:00',
};

export function getSettings(): Settings {
  const rows = db().getAllSync<{ key: string; value: string }>('select key, value from settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function updateSettings(changes: Partial<Settings>) {
  db().withTransactionSync(() => {
    for (const [key, value] of Object.entries(changes)) {
      db().runSync(
        'insert into settings (key, value) values (?, ?) on conflict (key) do update set value = excluded.value',
        key,
        JSON.stringify(value),
      );
    }
  });
  notify('settings');
}

/** Makes sure there is a place to put plants in, on first launch. */
export function ensurePlace(): Place {
  const places = listPlaces();
  if (places.length > 0) return places[0];
  const place = createPlace('Ma maison');
  updateSettings({ current_place_id: place.id });
  return place;
}

// Rooms

type RoomRow = Omit<Room, 'is_outdoor'> & { is_outdoor: number };
const toRoom = (row: RoomRow): Room => ({ ...row, is_outdoor: row.is_outdoor === 1 });

export function listRooms(placeId: string): Room[] {
  return db()
    .getAllSync<RoomRow>(
      'select * from rooms where place_id = ? order by is_outdoor, name collate nocase',
      placeId,
    )
    .map(toRoom);
}

export function createRoom(placeId: string, input: RoomInput): Room {
  const id = randomUUID();
  db().runSync(
    'insert into rooms (id, place_id, name, light, is_outdoor, created_at) values (?, ?, ?, ?, ?, ?)',
    id,
    placeId,
    input.name.trim(),
    input.light,
    input.is_outdoor ? 1 : 0,
    now(),
  );
  notify('rooms');
  return toRoom(db().getFirstSync<RoomRow>('select * from rooms where id = ?', id)!);
}

export function updateRoom(id: string, input: RoomInput) {
  db().runSync(
    'update rooms set name = ?, light = ?, is_outdoor = ? where id = ?',
    input.name.trim(),
    input.light,
    input.is_outdoor ? 1 : 0,
    id,
  );
  notify('rooms');
}

/** Deletes a room; its plants stay, without a room. */
export function deleteRoom(id: string) {
  db().runSync('delete from rooms where id = ?', id);
  notify('rooms', 'plants');
}

// Plants

const PLANT_SELECT = `
  select p.*, ph.uri as main_photo_uri
  from plants p left join photos ph on ph.id = p.main_photo_id`;

export function listPlants(placeId: string): Plant[] {
  return db().getAllSync<Plant>(
    `${PLANT_SELECT} where p.place_id = ? order by p.nickname collate nocase`,
    placeId,
  );
}

export function getPlant(id: string): Plant | null {
  return db().getFirstSync<Plant>(`${PLANT_SELECT} where p.id = ?`, id);
}

export function createPlant(placeId: string, input: PlantInput): Plant {
  const id = randomUUID();
  const at = now();
  db().runSync(
    `insert into plants (id, place_id, room_id, nickname, species, acquired_on, pot, substrate, notes,
       species_sheet_id, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    placeId,
    input.room_id,
    input.nickname.trim(),
    clean(input.species),
    input.acquired_on,
    clean(input.pot),
    clean(input.substrate),
    clean(input.notes),
    input.species_sheet_id ?? null,
    at,
    at,
  );
  notify('plants');
  return getPlant(id)!;
}

export function updatePlant(id: string, input: PlantInput) {
  db().runSync(
    `update plants set room_id = ?, nickname = ?, species = ?, acquired_on = ?, pot = ?,
       substrate = ?, notes = ?, species_sheet_id = case when ? then ? else species_sheet_id end,
       updated_at = ?
     where id = ?`,
    input.room_id,
    input.nickname.trim(),
    clean(input.species),
    input.acquired_on,
    clean(input.pot),
    clean(input.substrate),
    clean(input.notes),
    input.species_sheet_id !== undefined ? 1 : 0,
    input.species_sheet_id ?? null,
    now(),
    id,
  );
  notify('plants');
}

/** Deletes a plant with its tasks, journal and photos. */
export function deletePlant(id: string) {
  const files = listPhotos(id);
  db().runSync('delete from plants where id = ?', id);
  files.forEach((f) => deletePhotoFile(f.uri));
  notify('plants', 'photos', 'tasks', 'events');
}

/** Links a plant to a species sheet, or unlinks it with null. */
export function setPlantSpeciesSheet(plantId: string, sheetId: string | null) {
  db().runSync('update plants set species_sheet_id = ?, updated_at = ? where id = ?', sheetId, now(), plantId);
  notify('plants');
}

// Species sheets

type SpeciesSheetRow = Omit<SpeciesSheet, 'data'> & { data: string };

/** Null when the stored JSON no longer passes validation (e.g. written by an older version). */
function toSpeciesSheet(row: SpeciesSheetRow | null): SpeciesSheet | null {
  if (!row) return null;
  try {
    const result = validateCareSheet(JSON.parse(row.data));
    return result.ok ? { ...row, data: result.value } : null;
  } catch {
    return null;
  }
}

export function getSpeciesSheet(id: string): SpeciesSheet | null {
  return toSpeciesSheet(db().getFirstSync<SpeciesSheetRow>('select * from species_sheets where id = ?', id));
}

/**
 * The stored sheet for a species name, whatever the case: by scientific name
 * first, then by common name (what people type). Reused instead of asking the
 * model again.
 */
export function findSpeciesSheet(name: string): SpeciesSheet | null {
  const key = speciesKey(name);
  if (!key) return null;
  return toSpeciesSheet(
    db().getFirstSync<SpeciesSheetRow>(
      `select * from species_sheets
       where scientific_name = ? collate nocase or common_name = ? collate nocase
       order by scientific_name = ? collate nocase desc, updated_at desc
       limit 1`,
      key,
      key,
      key,
    ),
  );
}

/** Stores a sheet, replacing the one with the same scientific name if there is one. */
export function saveSpeciesSheet(sheet: CareSheet, source: SpeciesSheetSource): SpeciesSheet {
  const data: CareSheet = {
    ...sheet,
    scientific_name: speciesKey(sheet.scientific_name),
    common_name: sheet.common_name.trim(),
  };
  const at = now();
  const existing = db().getFirstSync<{ id: string }>(
    'select id from species_sheets where scientific_name = ? collate nocase',
    data.scientific_name,
  );
  const id = existing?.id ?? randomUUID();
  if (existing) {
    db().runSync(
      `update species_sheets set scientific_name = ?, common_name = ?, data = ?, source = ?, updated_at = ?
       where id = ?`,
      data.scientific_name,
      data.common_name,
      JSON.stringify(data),
      source,
      at,
      id,
    );
  } else {
    db().runSync(
      `insert into species_sheets (id, scientific_name, common_name, data, source, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.scientific_name,
      data.common_name,
      JSON.stringify(data),
      source,
      at,
      at,
    );
  }
  notify('species_sheets');
  return getSpeciesSheet(id)!;
}

// Photos

export function listPhotos(plantId: string): Photo[] {
  return db().getAllSync<Photo>(
    'select * from photos where plant_id = ? order by created_at desc',
    plantId,
  );
}

/** Keeps a copy of the picked photo. The first photo becomes the main one. */
export async function addPhoto(plantId: string, sourceUri: string): Promise<Photo> {
  const id = randomUUID();
  const uri = await storePhotoFile(sourceUri, id);
  const photo: Photo = { id, plant_id: plantId, uri, created_at: now() };
  db().withTransactionSync(() => {
    db().runSync(
      'insert into photos (id, plant_id, uri, created_at) values (?, ?, ?, ?)',
      photo.id,
      plantId,
      uri,
      photo.created_at,
    );
    db().runSync('update plants set main_photo_id = ? where id = ? and main_photo_id is null', id, plantId);
  });
  notify('photos', 'plants');
  return photo;
}

export function setMainPhoto(plantId: string, photoId: string | null) {
  db().runSync('update plants set main_photo_id = ?, updated_at = ? where id = ?', photoId, now(), plantId);
  notify('plants');
}

/** Deletes a photo; if it was the main one, the most recent one left takes over. */
export function deletePhoto(photo: Photo) {
  db().withTransactionSync(() => {
    db().runSync('delete from photos where id = ?', photo.id);
    db().runSync(
      `update plants set main_photo_id = (
         select id from photos where plant_id = ? order by created_at desc limit 1
       ) where id = ? and main_photo_id = ?`,
      photo.plant_id,
      photo.plant_id,
      photo.id,
    );
  });
  deletePhotoFile(photo.uri);
  notify('photos', 'plants');
}

// Tasks

type TaskRow = Omit<Task, 'suggested_interval_days'>;
const toTask = (row: TaskRow): Task => ({
  ...row,
  suggested_interval_days: suggestedInterval(row.interval_days, row.wet_streak, row.wet_days),
});

/** Tasks of every plant of the place, soonest first. */
export function listTasks(placeId: string): Task[] {
  return db()
    .getAllSync<TaskRow>(
      `select t.* from tasks t join plants p on p.id = t.plant_id
       where p.place_id = ? order by t.next_due_on, t.created_at`,
      placeId,
    )
    .map(toTask);
}

export function getTask(id: string): Task | null {
  const row = db().getFirstSync<TaskRow>('select * from tasks where id = ?', id);
  return row ? toTask(row) : null;
}

/** When a task last done on `day` was done: now if today, else midday (only the day is known). */
function doneAt(day: string, at: string): string {
  if (day === today()) return at;
  const date = parseDate(day);
  date.setHours(12);
  return date.toISOString();
}

export function createTask(plantId: string, input: TaskInput): Task {
  const id = randomUUID();
  const at = now();
  const day = today();
  const lastDoneOn = input.last_done_on && input.last_done_on <= day ? input.last_done_on : null;
  db().runSync(
    `insert into tasks (id, plant_id, kind, label, interval_days, winter_factor, last_done_at, next_due_on,
       created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    plantId,
    input.kind,
    clean(input.label),
    input.interval_days,
    input.winter_factor,
    lastDoneOn ? doneAt(lastDoneOn, at) : null,
    input.next_due_on ?? firstDueOn(lastDoneOn, input.interval_days, input.winter_factor, day),
    at,
    at,
  );
  notify('tasks');
  return getTask(id)!;
}

/** Changing the interval resets the "soil still wet" streak: the suggestion was acted on. */
export function updateTask(id: string, input: TaskInput) {
  db().runSync(
    `update tasks set kind = ?, label = ?, winter_factor = ?, next_due_on = coalesce(?, next_due_on),
       wet_streak = case when interval_days = ? then wet_streak else 0 end,
       wet_days = case when interval_days = ? then wet_days else 0 end,
       interval_days = ?, updated_at = ?
     where id = ?`,
    input.kind,
    clean(input.label),
    input.winter_factor,
    input.next_due_on ?? null,
    input.interval_days,
    input.interval_days,
    input.interval_days,
    now(),
    id,
  );
  notify('tasks');
}

/** Deletes a task; its journal entries stay. */
export function deleteTask(id: string) {
  db().runSync('delete from tasks where id = ?', id);
  notify('tasks', 'events');
}

function logEvent(task: Task, kind: EventKind, occurredAt: string, extra: { days?: number; note?: string | null }) {
  db().runSync(
    `insert into events (id, plant_id, task_id, kind, task_kind, task_label, occurred_at, postponed_days, note)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    task.plant_id,
    task.id,
    kind,
    task.kind,
    task.label,
    occurredAt,
    extra.days ?? null,
    clean(extra.note),
  );
}

/** Marks the task done. The next due date counts from today. */
export function completeTask(id: string, note?: string) {
  const task = getTask(id);
  if (!task) return;
  const at = now();
  const day = today();
  db().withTransactionSync(() => {
    logEvent(task, 'done', at, { note });
    // Ticked twice the same day: keep it in the journal, leave the schedule.
    const alreadyDone = task.last_done_at && toDateString(new Date(task.last_done_at)) >= day;
    if (!alreadyDone) {
      db().runSync(
        `update tasks set last_done_at = ?, next_due_on = ?, wet_streak = 0, wet_days = 0, updated_at = ?
         where id = ?`,
        at,
        nextDueAfterDone(day, task.interval_days, task.winter_factor),
        at,
        id,
      );
    }
  });
  notify('tasks', 'events');
}

/** Pushes the task back a few days. */
export function snoozeTask(id: string, days: number) {
  const task = getTask(id);
  if (!task) return;
  const at = now();
  db().withTransactionSync(() => {
    logEvent(task, 'snoozed', at, { days });
    db().runSync(
      'update tasks set next_due_on = ?, updated_at = ? where id = ?',
      postpone(task.next_due_on, today(), days),
      at,
      id,
    );
  });
  notify('tasks', 'events');
}

/** The soil is still wet: pushes the task back and counts it, to suggest a longer interval. */
export function markSoilWet(id: string, days: number): Task | null {
  const task = getTask(id);
  if (!task) return null;
  const at = now();
  db().withTransactionSync(() => {
    logEvent(task, 'soil_wet', at, { days });
    db().runSync(
      `update tasks set next_due_on = ?, wet_streak = wet_streak + 1, wet_days = wet_days + ?, updated_at = ?
       where id = ?`,
      postpone(task.next_due_on, today(), days),
      days,
      at,
      id,
    );
  });
  notify('tasks', 'events');
  return getTask(id);
}

// Journal

export function listPlantEvents(plantId: string, limit = 50): CareEvent[] {
  return db().getAllSync<CareEvent>(
    'select * from events where plant_id = ? order by occurred_at desc limit ?',
    plantId,
    limit,
  );
}
