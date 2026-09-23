/**
 * All reads and writes of the local database. Writes report the tables they
 * change (see live.ts) so screens refresh on their own.
 */

import { randomUUID } from 'expo-crypto';

import { speciesKey, validateCareSheet, type CareSheet } from '@/lib/care-sheet';
import { addDays, parseDate, toDateString, today } from '@/lib/dates';
import { findReference } from '@/lib/plant-reference';
import { validateDiagnosis, type Diagnosis } from '@/lib/diagnosis';
import { firstDueOn, nextDueAfterDone, postpone, suggestedInterval } from '@/lib/schedule';
import { rainByDay, rainWaterings, type RainHour, type RainTask, type RainWatering } from '@/lib/weather';

import { database as db } from './database';
import { notify } from './live';
import { deletePhotoFile, storePhotoFile } from './photo-files';
import type {
  CareEvent,
  ChatMessage,
  ChatRole,
  Cutting,
  CuttingInput,
  CuttingStatus,
  DiagnosisRecord,
  EventKind,
  Photo,
  Place,
  PlaceLocation,
  Plant,
  PlantInput,
  Room,
  RoomInput,
  Settings,
  SpeciesSheet,
  SpeciesSheetSource,
  Task,
  TaskInput,
  Weather,
  Wish,
  WishInput,
} from './types';

const now = () => new Date().toISOString();
const clean = (value: string | null | undefined) => value?.trim() || null;

// Places

export function listPlaces(): Place[] {
  return db().getAllSync<Place>('select * from places order by created_at');
}

export function getPlace(id: string): Place | null {
  return db().getFirstSync<Place>('select * from places where id = ?', id);
}

export function createPlace(name: string): Place {
  const place: Place = {
    id: randomUUID(),
    name: name.trim(),
    location_name: null,
    latitude: null,
    longitude: null,
    created_at: now(),
  };
  db().runSync('insert into places (id, name, created_at) values (?, ?, ?)', place.id, place.name, place.created_at);
  notify('places');
  return place;
}

export function renamePlace(id: string, name: string) {
  db().runSync('update places set name = ? where id = ?', name.trim(), id);
  notify('places');
}

/** Sets the town of a place, or clears it with null. Its weather is fetched again. */
export function setPlaceLocation(id: string, location: PlaceLocation | null) {
  db().withTransactionSync(() => {
    db().runSync(
      'update places set location_name = ?, latitude = ?, longitude = ? where id = ?',
      location?.name.trim() ?? null,
      location?.latitude ?? null,
      location?.longitude ?? null,
      id,
    );
    db().runSync('delete from weather where place_id = ?', id);
  });
  notify('places', 'weather');
}

/** Deletes a place with its rooms, plants, tasks, journal, photos, diagnoses, conversations and cuttings. */
export function deletePlace(id: string) {
  const files = db().getAllSync<{ uri: string }>(
    `select ph.uri from photos ph join plants p on p.id = ph.plant_id where p.place_id = ?
     union all
     select photo_uri as uri from cuttings where place_id = ? and photo_uri is not null`,
    id,
    id,
  );
  db().runSync('delete from places where id = ?', id);
  files.forEach((f) => deletePhotoFile(f.uri));
  notify(
    'places',
    'rooms',
    'plants',
    'photos',
    'tasks',
    'events',
    'diagnoses',
    'chat_messages',
    'weather',
    'cuttings',
  );
}

// Settings

const DEFAULT_SETTINGS: Settings = {
  current_place_id: null,
  daily_summary_enabled: true,
  daily_summary_time: '08:00',
  last_backup_at: null,
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

export function getRoom(id: string): Room | null {
  const row = db().getFirstSync<RoomRow>('select * from rooms where id = ?', id);
  return row ? toRoom(row) : null;
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

/** Deletes a plant with its tasks, journal, photos, diagnoses and conversation. Its cuttings stay. */
export function deletePlant(id: string) {
  const files = listPhotos(id);
  db().runSync('delete from plants where id = ?', id);
  files.forEach((f) => deletePhotoFile(f.uri));
  notify('plants', 'photos', 'tasks', 'events', 'diagnoses', 'chat_messages', 'cuttings');
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
 * first, then by common name (what people type), then under the name the
 * reference base gives it ("Sansevieria trifasciata" finds the sheet stored
 * as "Dracaena trifasciata"). Reused instead of asking the model again.
 */
export function findSpeciesSheet(name: string): SpeciesSheet | null {
  const key = speciesKey(name);
  if (!key) return null;
  const found = findSheetRow(key);
  if (found) return toSpeciesSheet(found);
  const reference = findReference(key);
  return reference ? toSpeciesSheet(findSheetRow(reference.scientific_name)) : null;
}

function findSheetRow(key: string): SpeciesSheetRow | null {
  return db().getFirstSync<SpeciesSheetRow>(
    `select * from species_sheets
     where scientific_name = ? collate nocase or common_name = ? collate nocase
     order by scientific_name = ? collate nocase desc, updated_at desc
     limit 1`,
    key,
    key,
    key,
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

// Photos restored from an older backup have no taken_at: the day they were added stands in.
const PHOTO_DATE = 'coalesce(ph.taken_at, ph.created_at)';

const PHOTO_SELECT = `
  select ph.id, ph.plant_id, ph.uri, ph.created_at, ${PHOTO_DATE} as taken_at,
    (select d.id from diagnoses d where d.photo_id = ph.id order by d.created_at desc limit 1) as diagnosis_id
  from photos ph`;

/** Photos of a plant, most recently taken first. */
export function listPhotos(plantId: string): Photo[] {
  return db().getAllSync<Photo>(
    `${PHOTO_SELECT} where ph.plant_id = ? order by ${PHOTO_DATE} desc, ph.created_at desc`,
    plantId,
  );
}

/**
 * Keeps a copy of the picked photo, dated `takenAt` (an instant, never in the
 * future) or now. The first photo becomes the main one, unless `asMain` is
 * false (a close-up of a sick leaf is a poor portrait).
 */
export async function addPhoto(
  plantId: string,
  sourceUri: string,
  { asMain = true, takenAt }: { asMain?: boolean; takenAt?: string } = {},
): Promise<Photo> {
  const id = randomUUID();
  const uri = await storePhotoFile(sourceUri, id);
  const at = now();
  const photo: Photo = {
    id,
    plant_id: plantId,
    uri,
    taken_at: takenAt && takenAt < at ? takenAt : at,
    diagnosis_id: null,
    created_at: at,
  };
  db().withTransactionSync(() => {
    db().runSync(
      'insert into photos (id, plant_id, uri, taken_at, created_at) values (?, ?, ?, ?, ?)',
      photo.id,
      plantId,
      uri,
      photo.taken_at,
      photo.created_at,
    );
    if (asMain) {
      db().runSync('update plants set main_photo_id = ? where id = ? and main_photo_id is null', id, plantId);
    }
  });
  notify('photos', 'plants');
  return photo;
}

export function getPhoto(id: string): Photo | null {
  return db().getFirstSync<Photo>(`${PHOTO_SELECT} where ph.id = ?`, id);
}

/** Changes when a photo was taken (an instant). */
export function setPhotoTakenAt(id: string, takenAt: string) {
  db().runSync('update photos set taken_at = ? where id = ?', takenAt, id);
  notify('photos');
}

export function setMainPhoto(plantId: string, photoId: string | null) {
  db().runSync('update plants set main_photo_id = ?, updated_at = ? where id = ?', photoId, now(), plantId);
  notify('plants');
}

/**
 * Deletes a photo; if it was the main one, the most recently taken one left
 * takes over, diagnosis close-ups last. Diagnoses made from it stay, without
 * a photo.
 */
export function deletePhoto(photo: Photo) {
  db().withTransactionSync(() => {
    db().runSync('delete from photos where id = ?', photo.id);
    db().runSync(
      `update plants set main_photo_id = (
         select ph.id from photos ph where ph.plant_id = ?
         order by exists (select 1 from diagnoses d where d.photo_id = ph.id),
           ${PHOTO_DATE} desc, ph.created_at desc
         limit 1
       ) where id = ? and main_photo_id = ?`,
      photo.plant_id,
      photo.plant_id,
      photo.id,
    );
  });
  deletePhotoFile(photo.uri);
  notify('photos', 'plants', 'diagnoses');
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

/** Tasks of one plant, soonest first. */
export function listPlantTasks(plantId: string): Task[] {
  return db()
    .getAllSync<TaskRow>('select * from tasks where plant_id = ? order by next_due_on, created_at', plantId)
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

function logEvent(
  task: Task,
  kind: EventKind,
  occurredAt: string,
  extra: { days?: number; note?: string | null; rainMm?: number },
) {
  db().runSync(
    `insert into events (id, plant_id, task_id, kind, task_kind, task_label, occurred_at, postponed_days, note,
       rain_mm)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    task.plant_id,
    task.id,
    kind,
    task.kind,
    task.label,
    occurredAt,
    extra.days ?? null,
    clean(extra.note),
    extra.rainMm ?? null,
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

// Weather

type WeatherRow = {
  place_id: string;
  fetched_at: string;
  hours: string;
  watered_on: string | null;
  rain_day: string | null;
  rain_mm: number | null;
  watered_plants: number | null;
};

function toWeather(row: WeatherRow | null): Weather | null {
  if (!row) return null;
  let hours: RainHour[] = [];
  try {
    const parsed: unknown = JSON.parse(row.hours);
    if (Array.isArray(parsed)) hours = parsed as RainHour[];
  } catch {
    // A broken cache is no rain known: it is fetched again soon.
  }
  const { watered_on, rain_day, rain_mm, watered_plants } = row;
  return {
    place_id: row.place_id,
    fetched_at: row.fetched_at,
    hours,
    watered:
      watered_on && rain_day && rain_mm !== null && watered_plants !== null
        ? { on: watered_on, rain_day, mm: rain_mm, plants: watered_plants }
        : null,
  };
}

/** The rain around a place, as last fetched. */
export function getWeather(placeId: string): Weather | null {
  return toWeather(db().getFirstSync<WeatherRow>('select * from weather where place_id = ?', placeId));
}

/** Keeps a new forecast of a place; what the rain last watered stays. */
export function saveWeather(placeId: string, fetchedAt: string, hours: RainHour[]) {
  db().runSync(
    `insert into weather (place_id, fetched_at, hours) values (?, ?, ?)
     on conflict (place_id) do update set fetched_at = excluded.fetched_at, hours = excluded.hours`,
    placeId,
    fetchedAt,
    JSON.stringify(hours),
  );
  notify('weather');
}

/**
 * Lets the rain water the outdoor plants of a place (the rule is in
 * src/lib/weather.ts): each watering goes in the journal, dated on the rain
 * day, and the task starts again from that day. Returns what was watered.
 */
export function waterWithRain(placeId: string): RainWatering[] {
  const weather = getWeather(placeId);
  if (!weather) return [];
  const rain = rainByDay(weather.hours, Date.parse(weather.fetched_at));
  const rows = db().getAllSync<TaskRow & { outdoor: number }>(
    `select t.*, coalesce(r.is_outdoor, 0) as outdoor
     from tasks t join plants p on p.id = t.plant_id left join rooms r on r.id = p.room_id
     where p.place_id = ? and t.kind = 'water'`,
    placeId,
  );
  const tasks = new Map(rows.map(({ outdoor, ...row }) => [row.id, { ...toTask(row), outdoor: outdoor === 1 }]));
  const day = today();
  const waterings = rainWaterings([...tasks.values()] satisfies RainTask[], rain, day);
  if (waterings.length === 0) return [];

  const at = now();
  const latest = waterings.reduce((a, b) => (b.day > a.day ? b : a));
  const plants = new Set(waterings.map((w) => w.plantId)).size;
  db().withTransactionSync(() => {
    for (const watering of waterings) {
      const task = tasks.get(watering.taskId)!;
      const doneOn = doneAt(watering.day, at);
      logEvent(task, 'done', doneOn, { rainMm: watering.mm });
      db().runSync(
        `update tasks set last_done_at = ?, next_due_on = ?, wet_streak = 0, wet_days = 0, updated_at = ?
         where id = ?`,
        doneOn,
        watering.nextDueOn,
        at,
        task.id,
      );
    }
    // Shown on the Today screen that day; a second rain the same day adds its plants.
    db().runSync(
      `update weather set rain_day = ?, rain_mm = ?,
         watered_plants = case when watered_on = ? then coalesce(watered_plants, 0) + ? else ? end,
         watered_on = ?
       where place_id = ?`,
      latest.day,
      latest.mm,
      day,
      plants,
      plants,
      day,
      placeId,
    );
  });
  notify('tasks', 'events', 'weather');
  return waterings;
}

// Journal

export function listPlantEvents(plantId: string, limit = 50): CareEvent[] {
  return db().getAllSync<CareEvent>(
    'select * from events where plant_id = ? order by occurred_at desc limit ?',
    plantId,
    limit,
  );
}

/** Journal of the place's plants from `fromDay` to `toDay` included (local days), oldest first. */
export function listPlaceEvents(placeId: string, fromDay: string, toDay: string): CareEvent[] {
  return db().getAllSync<CareEvent>(
    `select e.* from events e join plants p on p.id = e.plant_id
     where p.place_id = ? and e.occurred_at >= ? and e.occurred_at < ?
     order by e.occurred_at`,
    placeId,
    parseDate(fromDay).toISOString(),
    parseDate(addDays(toDay, 1)).toISOString(),
  );
}

// Diagnoses

type DiagnosisRow = Omit<DiagnosisRecord, 'data'> & { data: string };

const DIAGNOSIS_SELECT = `
  select d.*, ph.uri as photo_uri
  from diagnoses d left join photos ph on ph.id = d.photo_id`;

/** Null when the stored JSON no longer passes validation (e.g. written by an older version). */
function toDiagnosis(row: DiagnosisRow | null): DiagnosisRecord | null {
  if (!row) return null;
  try {
    const result = validateDiagnosis(JSON.parse(row.data));
    return result.ok ? { ...row, data: result.value } : null;
  } catch {
    return null;
  }
}

/** Diagnoses of a plant, newest first. */
export function listDiagnoses(plantId: string): DiagnosisRecord[] {
  return db()
    .getAllSync<DiagnosisRow>(
      `${DIAGNOSIS_SELECT} where d.plant_id = ? order by d.created_at desc`,
      plantId,
    )
    .map(toDiagnosis)
    .filter((d): d is DiagnosisRecord => d !== null);
}

export function getDiagnosis(id: string): DiagnosisRecord | null {
  return toDiagnosis(db().getFirstSync<DiagnosisRow>(`${DIAGNOSIS_SELECT} where d.id = ?`, id));
}

/**
 * Keeps a diagnosis with the photo it was made from. The photo joins the
 * plant's photos without becoming its main one.
 */
export async function saveDiagnosis(
  plantId: string,
  photoUri: string | null,
  diagnosis: Diagnosis,
): Promise<DiagnosisRecord> {
  const photo = photoUri ? await addPhoto(plantId, photoUri, { asMain: false }) : null;
  const record: DiagnosisRecord = {
    id: randomUUID(),
    plant_id: plantId,
    photo_id: photo?.id ?? null,
    photo_uri: photo?.uri ?? null,
    status: diagnosis.status,
    data: diagnosis,
    created_at: now(),
  };
  db().runSync(
    'insert into diagnoses (id, plant_id, photo_id, status, data, created_at) values (?, ?, ?, ?, ?, ?)',
    record.id,
    plantId,
    record.photo_id,
    record.status,
    JSON.stringify(diagnosis),
    record.created_at,
  );
  notify('diagnoses');
  return record;
}

/**
 * Deletes a diagnosis with the photo taken for it, unless that photo became
 * the plant's main one.
 */
export function deleteDiagnosis(id: string) {
  const row = db().getFirstSync<{ photo_id: string | null; main_photo_id: string | null }>(
    `select d.photo_id, p.main_photo_id from diagnoses d join plants p on p.id = d.plant_id where d.id = ?`,
    id,
  );
  db().runSync('delete from diagnoses where id = ?', id);
  notify('diagnoses');
  const photo = row?.photo_id && row.photo_id !== row.main_photo_id ? getPhoto(row.photo_id) : null;
  if (photo) deletePhoto(photo);
}

// Cuttings

/** Cuttings of a place, most recently started first. */
export function listCuttings(placeId: string): Cutting[] {
  return db().getAllSync<Cutting>(
    'select * from cuttings where place_id = ? order by started_on desc, created_at desc',
    placeId,
  );
}

export function getCutting(id: string): Cutting | null {
  return db().getFirstSync<Cutting>('select * from cuttings where id = ?', id);
}

/** The cutting a plant grew from, if it did. */
export function getPlantCutting(plantId: string): Cutting | null {
  return db().getFirstSync<Cutting>(
    'select * from cuttings where plant_id = ? order by updated_at desc limit 1',
    plantId,
  );
}

export function createCutting(placeId: string, input: CuttingInput): Cutting {
  const id = randomUUID();
  const at = now();
  db().runSync(
    `insert into cuttings (id, place_id, parent_plant_id, species, started_on, method, notes, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    placeId,
    input.parent_plant_id,
    clean(input.species),
    input.started_on,
    input.method,
    clean(input.notes),
    at,
    at,
  );
  notify('cuttings');
  return getCutting(id)!;
}

export function updateCutting(id: string, input: CuttingInput) {
  db().runSync(
    `update cuttings set parent_plant_id = ?, species = ?, started_on = ?, method = ?, notes = ?, updated_at = ?
     where id = ?`,
    input.parent_plant_id,
    clean(input.species),
    input.started_on,
    input.method,
    clean(input.notes),
    now(),
    id,
  );
  notify('cuttings');
}

export function setCuttingStatus(id: string, status: CuttingStatus) {
  db().runSync('update cuttings set status = ?, updated_at = ? where id = ?', status, now(), id);
  notify('cuttings');
}

/** « En faire une plante » : the cutting is potted, and keeps a link to the plant it became. */
export function cuttingBecamePlant(id: string, plantId: string) {
  db().runSync(
    "update cuttings set status = 'potted', plant_id = ?, updated_at = ? where id = ?",
    plantId,
    now(),
    id,
  );
  notify('cuttings');
}

/**
 * Keeps a copy of a picked photo as the cutting's photo, dated `takenAt` (never
 * in the future) or now, in place of the previous one. Null removes it.
 */
export async function setCuttingPhoto(id: string, photo: { uri: string; takenAt?: string } | null) {
  const previous = getCutting(id)?.photo_uri ?? null;
  const at = now();
  let changes: number;
  if (photo) {
    const photoId = randomUUID();
    const uri = await storePhotoFile(photo.uri, photoId);
    changes = db().runSync(
      'update cuttings set photo_id = ?, photo_uri = ?, photo_taken_at = ?, updated_at = ? where id = ?',
      photoId,
      uri,
      photo.takenAt && photo.takenAt < at ? photo.takenAt : at,
      at,
      id,
    ).changes;
    // Deleted while the photo was copied.
    if (changes === 0) deletePhotoFile(uri);
  } else {
    changes = db().runSync(
      'update cuttings set photo_id = null, photo_uri = null, photo_taken_at = null, updated_at = ? where id = ?',
      at,
      id,
    ).changes;
  }
  if (changes > 0 && previous) deletePhotoFile(previous);
  notify('cuttings');
}

/** Deletes a cutting and its photo; the plant it became stays. */
export function deleteCutting(id: string) {
  const cutting = getCutting(id);
  db().runSync('delete from cuttings where id = ?', id);
  if (cutting?.photo_uri) deletePhotoFile(cutting.photo_uri);
  notify('cuttings');
}

// Wishlist

/** Species I would like to have, most recently added first. */
export function listWishes(): Wish[] {
  return db().getAllSync<Wish>('select * from wishes order by created_at desc');
}

export function getWish(id: string): Wish | null {
  return db().getFirstSync<Wish>('select * from wishes where id = ?', id);
}

export function createWish(input: WishInput): Wish {
  const wish: Wish = { id: randomUUID(), species: input.species.trim(), note: clean(input.note), created_at: now() };
  db().runSync(
    'insert into wishes (id, species, note, created_at) values (?, ?, ?, ?)',
    wish.id,
    wish.species,
    wish.note,
    wish.created_at,
  );
  notify('wishes');
  return wish;
}

export function updateWish(id: string, input: WishInput) {
  db().runSync('update wishes set species = ?, note = ? where id = ?', input.species.trim(), clean(input.note), id);
  notify('wishes');
}

export function deleteWish(id: string) {
  db().runSync('delete from wishes where id = ?', id);
  notify('wishes');
}

// "Demande à Plantule" conversations

/** Messages of a plant's conversation, oldest first. */
export function listChatMessages(plantId: string): ChatMessage[] {
  return db().getAllSync<ChatMessage>(
    'select * from chat_messages where plant_id = ? order by created_at, rowid',
    plantId,
  );
}

export function addChatMessage(plantId: string, role: ChatRole, text: string): ChatMessage {
  const message: ChatMessage = { id: randomUUID(), plant_id: plantId, role, text: text.trim(), created_at: now() };
  db().runSync(
    'insert into chat_messages (id, plant_id, role, text, created_at) values (?, ?, ?, ?, ?)',
    message.id,
    plantId,
    role,
    message.text,
    message.created_at,
  );
  notify('chat_messages');
  return message;
}

export function clearChatMessages(plantId: string) {
  db().runSync('delete from chat_messages where plant_id = ?', plantId);
  notify('chat_messages');
}
