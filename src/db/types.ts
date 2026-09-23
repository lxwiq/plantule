/** Data stored on the phone. Dates are "YYYY-MM-DD", instants are ISO strings. */

import type { Outfit } from '@/art/types';
import type { CareSheet } from '@/lib/care-sheet';
import type { Diagnosis, DiagnosisStatus } from '@/lib/diagnosis';
import type { RainHour } from '@/lib/weather';

export type Light = 'full_sun' | 'bright_indirect' | 'partial_shade' | 'shade';

export type TaskKind =
  | 'water'
  | 'fertilize'
  | 'mist'
  | 'repot'
  | 'prune'
  | 'clean'
  | 'rotate'
  | 'other';

export type EventKind = 'done' | 'snoozed' | 'soil_wet';

/** A home or other location with its own rooms and plants. */
export type Place = {
  id: string;
  name: string;
  /** The town it is in, for the rain on its outdoor plants; null when not set. */
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

/** Where a place is, for the weather. */
export type PlaceLocation = { name: string; latitude: number; longitude: number };

/**
 * The rain around a place, from Open-Meteo, and the last time it watered the
 * outdoor plants. A cache, fetched again when missing: not in backups.
 */
export type Weather = {
  place_id: string;
  /** ISO instant of the forecast: hours ending later were still to come. */
  fetched_at: string;
  /** Hours with rain, over the past days and the next two. */
  hours: RainHour[];
  /** `on` the day it was noticed, `rain_day` the day it rained. */
  watered: { on: string; rain_day: string; mm: number; plants: number } | null;
};

export type Room = {
  id: string;
  place_id: string;
  name: string;
  light: Light | null;
  is_outdoor: boolean;
  created_at: string;
};

export type Plant = {
  id: string;
  place_id: string;
  room_id: string | null;
  nickname: string;
  /** Free text, typed or confirmed after a scan. */
  species: string | null;
  species_sheet_id: string | null;
  acquired_on: string | null;
  pot: string | null;
  substrate: string | null;
  notes: string | null;
  main_photo_id: string | null;
  /** File of the main photo, joined from photos. */
  main_photo_uri: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Where a species sheet comes from: written by the on-device model, or with
 * its figures from the reference base (`data.reference_id` is set).
 */
export type SpeciesSheetSource = 'ai' | 'reference';

/** Care advice for a species, shared by every plant of that species. */
export type SpeciesSheet = {
  id: string;
  /** Unique, whatever the case. */
  scientific_name: string;
  common_name: string;
  data: CareSheet;
  source: SpeciesSheetSource;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  plant_id: string;
  uri: string;
  /** When it was taken (from the gallery photo, or set by hand); when it was added if unknown. */
  taken_at: string;
  /** The diagnosis it illustrates, joined from diagnoses: a close-up, not a portrait. */
  diagnosis_id: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  plant_id: string;
  kind: TaskKind;
  label: string | null;
  interval_days: number;
  /** Interval multiplier from November to February. */
  winter_factor: number;
  last_done_at: string | null;
  next_due_on: string;
  /** "Soil still wet" postponements since the task was last done. */
  wet_streak: number;
  wet_days: number;
  /** Set when the soil was repeatedly still wet: a better interval to offer. */
  suggested_interval_days: number | null;
  created_at: string;
  updated_at: string;
};

/** A journal entry: what was done, and when. Survives the task's deletion. */
export type CareEvent = {
  id: string;
  plant_id: string;
  task_id: string | null;
  kind: EventKind;
  task_kind: TaskKind;
  task_label: string | null;
  occurred_at: string;
  postponed_days: number | null;
  note: string | null;
  /** Set when the rain did it (kind "done"), in mm. */
  rain_mm: number | null;
};

/** A health check of a plant from a photo, kept to follow how it does. */
export type DiagnosisRecord = {
  id: string;
  plant_id: string;
  /** The photo it was made from; null once that photo is deleted. */
  photo_id: string | null;
  /** File of the photo, joined from photos. */
  photo_uri: string | null;
  /** Copied from `data.status`, to list diagnoses without reading their data. */
  status: DiagnosisStatus;
  data: Diagnosis;
  created_at: string;
};

export type ChatRole = 'user' | 'assistant';

/** A message of the "Demande à Plantule" conversation, one per plant. */
export type ChatMessage = {
  id: string;
  plant_id: string;
  role: ChatRole;
  text: string;
  created_at: string;
};

export type CuttingMethod = 'water' | 'soil' | 'sphagnum' | 'perlite' | 'other';

/** Rooting, then rooted, then potted; or failed. */
export type CuttingStatus = 'rooting' | 'rooted' | 'potted' | 'failed';

/** A cutting, kept with the place it grows in. */
export type Cutting = {
  id: string;
  place_id: string;
  /** The plant of the collection it was taken from; null when unknown or deleted. */
  parent_plant_id: string | null;
  /** The plant it became (« En faire une plante »). */
  plant_id: string | null;
  /** Free text, like a plant's. */
  species: string | null;
  started_on: string;
  method: CuttingMethod;
  status: CuttingStatus;
  notes: string | null;
  /** The file of its photo: `photo_id` names it in the photos folder and in backups. */
  photo_id: string | null;
  photo_uri: string | null;
  photo_taken_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CuttingInput = {
  parent_plant_id: string | null;
  species: string | null;
  started_on: string;
  method: CuttingMethod;
  notes: string | null;
};

/** A species I would like to have, whatever the place. */
export type Wish = {
  id: string;
  /** Free text, often a name from the reference base. */
  species: string;
  note: string | null;
  created_at: string;
};

export type WishInput = { species: string; note: string | null };

export type Settings = {
  current_place_id: string | null;
  daily_summary_enabled: boolean;
  /** "HH:MM" */
  daily_summary_time: string;
  /** ISO instant of the last backup file made, or imported, on this phone. */
  last_backup_at: string | null;
  /** The coming care is written to an agenda « Plantule » in the phone's calendar. */
  agenda_enabled: boolean;
  /** That agenda's id in the phone's calendar, once created. */
  agenda_calendar_id: string | null;
  /** The mascot's name, Pépin unless the user renamed it. */
  mascot_name: string;
  /** What the mascot wears; read it through `normalizeOutfit()`. */
  mascot_outfit: Outfit;
};

export type RoomInput = { name: string; light: Light | null; is_outdoor: boolean };

export type PlantInput = {
  nickname: string;
  species: string | null;
  room_id: string | null;
  acquired_on: string | null;
  pot: string | null;
  substrate: string | null;
  notes: string | null;
  /** Leaving it out keeps the current sheet on update, and means none on creation. */
  species_sheet_id?: string | null;
};

export type TaskInput = {
  kind: TaskKind;
  label: string | null;
  interval_days: number;
  winter_factor: number;
  /**
   * Leaving it out keeps the current date on update. On creation it means one
   * interval after `last_done_on`, or today.
   */
  next_due_on?: string;
  /** Creation only: the day it was last done, before the plant was added to the app. */
  last_done_on?: string | null;
};
