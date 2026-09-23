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
  // 2: species care sheets, written by the on-device model and shared by the
  // plants of the same species.
  `
  create table species_sheets (
    id text primary key,
    scientific_name text not null,
    common_name text not null,
    data text not null,
    source text not null,
    created_at text not null,
    updated_at text not null
  );
  create unique index species_sheets_name_idx on species_sheets (scientific_name collate nocase);

  alter table plants add column species_sheet_id text references species_sheets (id) on delete set null;
  create index plants_sheet_idx on plants (species_sheet_id);
  `,
  // 3: health checks from a photo, and the "Demande à Plantule" conversation
  // of each plant. Both go with their plant.
  `
  create table diagnoses (
    id text primary key,
    plant_id text not null references plants (id) on delete cascade,
    photo_id text references photos (id) on delete set null,
    status text not null check (status in ('healthy', 'watch', 'treat')),
    data text not null,
    created_at text not null
  );
  create index diagnoses_plant_idx on diagnoses (plant_id, created_at);
  create index diagnoses_photo_idx on diagnoses (photo_id);

  create table chat_messages (
    id text primary key,
    plant_id text not null references plants (id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    text text not null,
    created_at text not null
  );
  create index chat_messages_plant_idx on chat_messages (plant_id, created_at);
  `,
  // 4: when each photo was taken, for the growth gallery. Photos restored from
  // an older backup may still lack it: reads fall back to created_at.
  `
  alter table photos add column taken_at text;
  update photos set taken_at = created_at;
  create index photos_taken_idx on photos (plant_id, taken_at);
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
  if (__DEV__) {
    // Deletes cascade through foreign keys (a plant's tasks, photos, diagnoses…),
    // which SQLite only enforces on a connection that turned them on.
    const row = await db.getFirstAsync<{ foreign_keys: number }>('pragma foreign_keys');
    if (row?.foreign_keys !== 1) console.warn('SQLite foreign keys are off: deletes will not cascade.');
  }
  await migrate(db);
  instance = db;
}

/** The open database. */
export function database(): SQLiteDatabase {
  if (!instance) throw new Error('Database used before initDatabase()');
  return instance;
}
