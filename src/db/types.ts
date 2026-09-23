/** Data stored on the phone. Dates are "YYYY-MM-DD", instants are ISO strings. */

import type { CareSheet } from '@/lib/care-sheet';

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
  created_at: string;
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

/** Where a species sheet comes from. Only the on-device model for now. */
export type SpeciesSheetSource = 'ai';

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
};

export type Settings = {
  current_place_id: string | null;
  daily_summary_enabled: boolean;
  /** "HH:MM" */
  daily_summary_time: string;
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
