/**
 * The backup file: a zip holding `plantule.json` (every row of every table)
 * and `photos/<photo id>.jpg`, for the photos of plants and of cuttings. Everything here is pure: building and checking
 * the manifest, and preparing its rows for this phone. The file and database
 * work is in src/db/backup.ts.
 */

import { strFromU8, strToU8, unzipSync, Zip, ZipDeflate, ZipPassThrough } from 'fflate';

import { daysBetween, formatShortDate, toDateString, today } from './dates';
import { plural } from './labels';

export const BACKUP_FORMAT = 'plantule-backup';
/** Version of the file layout, not of the database: the schema has its own number. */
export const BACKUP_VERSION = 1;
export const MANIFEST_NAME = 'plantule.json';
export const BACKUP_MIME_TYPE = 'application/zip';

/**
 * Every table, parents first: rows are inserted in this order and deleted in
 * the reverse one. A new table goes here; new columns need nothing, as
 * columns are never listed. Only `weather` stays out: a cache, fetched again,
 * and deleted with the places it belongs to.
 */
export const BACKUP_TABLES = [
  'places',
  'rooms',
  'species_sheets',
  'plants',
  'photos',
  'tasks',
  'events',
  'diagnoses',
  'chat_messages',
  'cuttings',
  'wishes',
  'settings',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupValue = string | number | null;
export type BackupRow = Record<string, BackupValue>;
export type BackupTables = Record<BackupTable, BackupRow[]>;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** The database's `user_version` when the backup was made. */
  schema_version: number;
  /** ISO instant. */
  exported_at: string;
  app_version: string | null;
  tables: BackupTables;
};

export const BACKUP_ERRORS = {
  invalid: 'Ce fichier n’est pas une sauvegarde Plantule, ou il est abîmé.',
  newer: 'Cette sauvegarde vient d’une version plus récente de Plantule. Mets l’app à jour puis réessaie.',
};

export function buildBackup(input: {
  tables: BackupTables;
  schemaVersion: number;
  exportedAt: string;
  appVersion: string | null;
}): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schema_version: input.schemaVersion,
    exported_at: input.exportedAt,
    app_version: input.appVersion,
    tables: input.tables,
  };
}

/** "plantule-sauvegarde-2026-09-23.zip", with the local date. */
export function backupFileName(date: Date): string {
  return `plantule-sauvegarde-${toDateString(date)}.zip`;
}

/** Photo ids become file names on the phone: only plain ids are accepted. */
const PHOTO_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isSafePhotoId(id: unknown): id is string {
  return typeof id === 'string' && PHOTO_ID.test(id);
}

export function photoEntryName(photoId: string): string {
  return `photos/${photoId}.jpg`;
}

/** The photo id of an archive entry, or null for any other entry. */
export function photoIdOfEntry(name: string): string | null {
  const match = /^photos\/([^/]+)\.jpg$/.exec(name);
  return match && isSafePhotoId(match[1]) ? match[1] : null;
}

/** A photo file the rows point at. */
export type PhotoFileRef = { id: string; uri: string };

/** Every photo file of the rows: the plants' photos, then the cuttings' ones. */
export function photoFilesOf(tables: Pick<BackupTables, 'photos' | 'cuttings'>): PhotoFileRef[] {
  const refs: PhotoFileRef[] = [];
  for (const { id, uri } of tables.photos) {
    if (isSafePhotoId(id) && typeof uri === 'string') refs.push({ id, uri });
  }
  for (const { photo_id: id, photo_uri: uri } of tables.cuttings) {
    if (isSafePhotoId(id) && typeof uri === 'string') refs.push({ id, uri });
  }
  return refs;
}

export type BackupCheck = { ok: true; backup: Backup } | { ok: false; error: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValue = (value: unknown): value is BackupValue =>
  value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));

const isRow = (value: unknown): value is BackupRow => isObject(value) && Object.values(value).every(isValue);

const isVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

/**
 * Reads `plantule.json` and checks it before anything on the phone changes.
 * A backup from a newer database schema is refused: this app would not know
 * what its new columns mean. A missing table (older backup) counts as empty.
 */
export function parseBackup(json: string, currentSchemaVersion: number): BackupCheck {
  const invalid: BackupCheck = { ok: false, error: BACKUP_ERRORS.invalid };
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return invalid;
  }
  if (!isObject(value) || value.format !== BACKUP_FORMAT) return invalid;
  if (!isVersion(value.version) || !isVersion(value.schema_version)) return invalid;
  if (value.version > BACKUP_VERSION || value.schema_version > currentSchemaVersion) {
    return { ok: false, error: BACKUP_ERRORS.newer };
  }
  if (typeof value.exported_at !== 'string' || Number.isNaN(Date.parse(value.exported_at))) return invalid;
  if (!isObject(value.tables)) return invalid;

  const tables = {} as BackupTables;
  for (const table of BACKUP_TABLES) {
    const rows = value.tables[table] ?? [];
    if (!Array.isArray(rows) || !rows.every(isRow)) return invalid;
    tables[table] = rows;
  }
  // The app always has a place; a backup without one is not from Plantule.
  if (tables.places.length === 0) return invalid;
  // Settings are read back as JSON on every screen: a broken one would stop the app.
  if (!tables.settings.every((s) => typeof s.key === 'string' && settingValue(s) !== undefined)) return invalid;

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: value.version,
      schema_version: value.schema_version,
      exported_at: value.exported_at,
      app_version: typeof value.app_version === 'string' ? value.app_version : null,
      tables,
    },
  };
}

export type BackupSummary = {
  exportedAt: string;
  places: number;
  plants: number;
  /** Photos that come with their file. */
  photos: number;
};

/** What the backup holds, given the photo files found in the archive. */
export function summarizeBackup(backup: Backup, photoFiles: ReadonlySet<string>): BackupSummary {
  return {
    exportedAt: backup.exported_at,
    places: backup.tables.places.length,
    plants: backup.tables.plants.length,
    photos: photoFilesOf(backup.tables).filter((photo) => photoFiles.has(photo.id)).length,
  };
}

/** "Sauvegarde du 12 septembre : 2 lieux, 14 plantes et 37 photos." */
export function describeBackup(summary: BackupSummary): string {
  const date = formatShortDate(toDateString(new Date(summary.exportedAt)));
  const places = plural(summary.places, 'lieu', 'lieux');
  return `Sauvegarde du ${date} : ${places}, ${plural(summary.plants, 'plante')} et ${plural(summary.photos, 'photo')}.`;
}

/** "aujourd’hui", "hier", "12 septembre", or "jamais". */
export function formatLastBackup(iso: string | null | undefined, reference = today()): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return 'jamais';
  const day = toDateString(new Date(iso));
  const days = daysBetween(day, reference);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return formatShortDate(day);
}

function settingValue(row: BackupRow | undefined): unknown {
  if (typeof row?.value !== 'string') return undefined;
  try {
    return JSON.parse(row.value);
  } catch {
    return undefined;
  }
}

/**
 * The rows to write on this phone. Photos keep only those whose file is in
 * the archive, pointing at this phone's photos folder (paths differ between
 * phones); references to a dropped photo are cleared, and so is the photo of
 * a cutting without its file. The place shown must exist, and the last backup
 * is the one being imported.
 */
export function prepareImport(
  backup: Backup,
  photoFiles: ReadonlySet<string>,
  photoUri: (photoId: string) => string,
): BackupTables {
  const { tables } = backup;
  const photos = tables.photos
    .filter((p) => isSafePhotoId(p.id) && photoFiles.has(p.id))
    .map((p): BackupRow => ({ ...p, uri: photoUri(String(p.id)) }));
  const kept = new Set(photos.map((p) => p.id));
  const keptPhoto = (id: BackupValue) => (id !== null && kept.has(id) ? id : null);
  const cuttings = tables.cuttings.map((c): BackupRow => {
    if (!('photo_id' in c)) return c;
    const id = isSafePhotoId(c.photo_id) && photoFiles.has(c.photo_id) ? c.photo_id : null;
    return id
      ? { ...c, photo_uri: photoUri(id) }
      : { ...c, photo_id: null, photo_uri: null, photo_taken_at: null };
  });

  const places = [...tables.places].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const placeIds = new Set(places.map((p) => p.id));
  const current = settingValue(tables.settings.find((s) => s.key === 'current_place_id'));
  const currentPlaceId = typeof current === 'string' && placeIds.has(current) ? current : places[0].id;
  const overrides: BackupRow[] = [
    { key: 'current_place_id', value: JSON.stringify(currentPlaceId) },
    { key: 'last_backup_at', value: JSON.stringify(backup.exported_at) },
  ];
  const overridden = new Set(overrides.map((s) => s.key));
  const settings = [...tables.settings.filter((s) => !overridden.has(s.key)), ...overrides];

  return {
    ...tables,
    plants: tables.plants.map((p) => ('main_photo_id' in p ? { ...p, main_photo_id: keptPhoto(p.main_photo_id) } : p)),
    photos,
    diagnoses: tables.diagnoses.map((d) => ('photo_id' in d ? { ...d, photo_id: keptPhoto(d.photo_id) } : d)),
    cuttings,
    settings,
  };
}

/**
 * The columns of `row` that the table has on this phone, in the table's
 * order. Columns added since the backup keep their default; columns this app
 * does not know are left out.
 */
export function insertColumns(row: BackupRow, tableColumns: readonly string[]): string[] {
  return tableColumns.filter((column) => Object.prototype.hasOwnProperty.call(row, column));
}

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

export function insertSql(table: BackupTable, columns: readonly string[]): string {
  if (columns.length === 0) return `insert into ${quote(table)} default values`;
  return `insert into ${quote(table)} (${columns.map(quote).join(', ')}) values (${columns.map(() => '?').join(', ')})`;
}

// The zip file

/**
 * Writes the archive chunk by chunk as entries are added, so the photos are
 * never all in memory at once. Photos are stored as they are: JPEG does not
 * compress further.
 */
export function createArchive(write: (chunk: Uint8Array) => void) {
  let failure: unknown = null;
  let complete = false;
  const zip = new Zip((error, chunk, final) => {
    if (error) failure ??= error;
    else {
      try {
        write(chunk);
      } catch (writeError) {
        failure ??= writeError;
      }
    }
    if (final) complete = true;
  });
  const check = () => {
    if (failure) throw failure;
  };
  return {
    addManifest(backup: Backup) {
      const entry = new ZipDeflate(MANIFEST_NAME, { level: 6 });
      zip.add(entry);
      entry.push(strToU8(JSON.stringify(backup)), true);
      check();
    },
    addPhoto(photoId: string, bytes: Uint8Array) {
      const entry = new ZipPassThrough(photoEntryName(photoId));
      zip.add(entry);
      entry.push(bytes, true);
      check();
    },
    end() {
      zip.end();
      check();
      if (!complete) throw new Error('The backup archive is incomplete');
    },
  };
}

export type OpenedBackup = {
  backup: Backup;
  /** Ids of the photos whose file is in the archive. */
  photoFiles: Set<string>;
  summary: BackupSummary;
};

/** Reads and checks the manifest of an archive, without extracting the photos. */
export function openArchive(
  archive: Uint8Array,
  currentSchemaVersion: number,
): { ok: true; opened: OpenedBackup } | { ok: false; error: string } {
  const names: string[] = [];
  let manifest: Uint8Array | undefined;
  try {
    manifest = unzipSync(archive, {
      filter: (file) => {
        names.push(file.name);
        return file.name === MANIFEST_NAME;
      },
    })[MANIFEST_NAME];
  } catch {
    return { ok: false, error: BACKUP_ERRORS.invalid };
  }
  if (!manifest) return { ok: false, error: BACKUP_ERRORS.invalid };
  const check = parseBackup(strFromU8(manifest), currentSchemaVersion);
  if (!check.ok) return check;
  const photoFiles = new Set(names.map(photoIdOfEntry).filter((id): id is string => id !== null));
  return {
    ok: true,
    opened: { backup: check.backup, photoFiles, summary: summarizeBackup(check.backup, photoFiles) },
  };
}

/** The files of some photos of the archive, by photo id. */
export function extractPhotos(archive: Uint8Array, photoIds: readonly string[]): Map<string, Uint8Array> {
  const wanted = new Set(photoIds.map(photoEntryName));
  const files = unzipSync(archive, { filter: (file) => wanted.has(file.name) });
  const photos = new Map<string, Uint8Array>();
  for (const [name, bytes] of Object.entries(files)) {
    const id = photoIdOfEntry(name);
    if (id) photos.set(id, bytes);
  }
  return photos;
}
