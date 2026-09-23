import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema versions, applied in order. Never edit a released migration: add a
 * new one. The applied version is stored in SQLite's `user_version`.
 */
const MIGRATIONS: string[] = [
  `
  create table places (
    id text primary key,
    name text not null,
    created_at text not null
  );

  create table rooms (
    id text primary key,
    place_id text not null references places (id) on delete cascade,
    name text not null,
    light text check (light in ('full_sun', 'bright_indirect', 'partial_shade', 'shade')),
    is_outdoor integer not null default 0,
    created_at text not null
  );
  create index rooms_place_idx on rooms (place_id);

  create table plants (
    id text primary key,
    place_id text not null references places (id) on delete cascade,
    room_id text references rooms (id) on delete set null,
    nickname text not null,
    species text,
    acquired_on text,
    pot text,
    substrate text,
    notes text,
    main_photo_id text,
    created_at text not null,
    updated_at text not null
  );
  create index plants_place_idx on plants (place_id);
  create index plants_room_idx on plants (room_id);

  create table photos (
    id text primary key,
    plant_id text not null references plants (id) on delete cascade,
    uri text not null,
    created_at text not null
  );
  create index photos_plant_idx on photos (plant_id, created_at);

  create table tasks (
    id text primary key,
    plant_id text not null references plants (id) on delete cascade,
    kind text not null
      check (kind in ('water', 'fertilize', 'mist', 'repot', 'prune', 'clean', 'rotate', 'other')),
    label text,
    interval_days integer not null check (interval_days between 1 and 730),
    winter_factor real not null default 1,
    last_done_at text,
    next_due_on text not null,
    wet_streak integer not null default 0,
    wet_days integer not null default 0,
    created_at text not null,
    updated_at text not null
  );
  create index tasks_plant_idx on tasks (plant_id);
  create index tasks_due_idx on tasks (next_due_on);

  create table events (
    id text primary key,
    plant_id text not null references plants (id) on delete cascade,
    task_id text references tasks (id) on delete set null,
    kind text not null check (kind in ('done', 'snoozed', 'soil_wet')),
    task_kind text not null,
    task_label text,
    occurred_at text not null,
    postponed_days integer,
    note text
  );
  create index events_plant_idx on events (plant_id, occurred_at);
  create index events_task_idx on events (task_id);

  create table settings (
    key text primary key,
    value text not null
  );
  `,
];

export const DATABASE_NAME = 'plantule.db';

async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('pragma user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    // Nothing else runs during startup, so a plain transaction is enough.
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`pragma user_version = ${version + 1}`);
    });
  }
}

let instance: SQLiteDatabase | null = null;

/**
 * Prepares the database opened by <SQLiteProvider> (see the root layout):
 * settings, migrations. Afterwards the app queries it synchronously.
 */
export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync('pragma journal_mode = wal; pragma foreign_keys = on;');
  await migrate(db);
  instance = db;
}

/** The open database. */
export function database(): SQLiteDatabase {
  if (!instance) throw new Error('Database used before initDatabase()');
  return instance;
}
