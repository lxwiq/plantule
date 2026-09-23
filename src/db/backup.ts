/**
 * Backup to a file and back, to change phones: every table and photo in one
 * zip (see src/lib/backup.ts) handed to the share sheet, and a picked backup
 * that replaces everything on this phone.
 */

import Constants from 'expo-constants';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteStatement } from 'expo-sqlite';

import {
  BACKUP_MIME_TYPE,
  BACKUP_TABLES,
  backupFileName,
  buildBackup,
  createArchive,
  extractPhotos,
  insertColumns,
  insertSql,
  isSafePhotoId,
  openArchive,
  prepareImport,
  type Backup,
  type BackupRow,
  type BackupTable,
  type BackupTables,
  type OpenedBackup,
} from '@/lib/backup';

import { database as db } from './database';
import { notify } from './live';
import { photoFile, photosDirectory } from './photo-files';
import { updateSettings } from './repo';

/** False in the browser build, which has no file system (see backup.web.ts). */
export const backupAvailable = true;

/** A backup that cannot be used, with a message for the user. */
export class BackupError extends Error {}

const exportsDirectory = () => new Directory(Paths.cache, 'backups');
const stagingDirectory = () => new Directory(Paths.cache, 'backup-import');

/** The archive is in memory during an import; its photos are extracted a few at a time. */
const EXTRACT_BATCH = 20;
const READ_CHUNK = 4 * 1024 * 1024;

function schemaVersion(): number {
  return db().getFirstSync<{ user_version: number }>('pragma user_version')?.user_version ?? 0;
}

function deleteQuietly(item: File | Directory) {
  try {
    if (item.exists) item.delete();
  } catch {
    // Left behind: the cache is cleared by Android when space runs low.
  }
}

// Export

/**
 * Writes every table and photo into a zip in the cache, then opens the share
 * sheet (Drive, email, Quick Share…). The previous export is deleted first.
 */
export async function exportBackup(): Promise<void> {
  const exportedAt = new Date();
  const tables = Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, db().getAllSync<BackupRow>(`select * from ${table}`)]),
  ) as BackupTables;
  const backup = buildBackup({
    tables,
    schemaVersion: schemaVersion(),
    exportedAt: exportedAt.toISOString(),
    appVersion: Constants.expoConfig?.version ?? null,
  });

  const directory = exportsDirectory();
  deleteQuietly(directory);
  directory.create({ intermediates: true });
  const file = new File(directory, backupFileName(exportedAt));
  try {
    await writeArchive(file, backup);
  } catch (error) {
    deleteQuietly(file);
    throw error;
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: BACKUP_MIME_TYPE,
    dialogTitle: 'Envoyer la sauvegarde',
    UTI: 'public.zip-archive',
  });
  updateSettings({ last_backup_at: backup.exported_at });
}

async function writeArchive(file: File, backup: Backup) {
  file.create({ overwrite: true });
  const handle = file.open(FileMode.WriteOnly);
  try {
    const archive = createArchive((chunk) => handle.writeBytes(chunk));
    archive.addManifest(backup);
    for (const { id, uri } of backup.tables.photos) {
      if (!isSafePhotoId(id) || typeof uri !== 'string') continue;
      // A photo whose file is gone is left out; the import drops its row.
      const bytes = await readPhoto(uri);
      if (bytes) archive.addPhoto(id, bytes);
    }
    archive.end();
  } finally {
    handle.close();
  }
}

async function readPhoto(uri: string): Promise<Uint8Array | null> {
  try {
    const file = new File(uri);
    return file.exists ? await file.bytes() : null;
  } catch {
    return null;
  }
}

// Import

export type PickedBackup = OpenedBackup & { archive: Uint8Array };

/** Opens the system file picker. Null when cancelled. */
export async function pickBackupFile(): Promise<File | null> {
  const picked = await File.pickFileAsync({
    mimeTypes: [BACKUP_MIME_TYPE, 'application/x-zip-compressed', 'application/octet-stream'],
  });
  return picked.canceled ? null : picked.result;
}

/** Reads and checks a backup, before anything on the phone changes. Throws a BackupError. */
export async function readBackup(file: File): Promise<PickedBackup> {
  // A local copy first: the picked file may come from Drive or another app,
  // and a local file can be read in chunks instead of in one huge buffer.
  const copy = new File(Paths.cache, 'backup-import.zip');
  let archive: Uint8Array;
  try {
    deleteQuietly(copy);
    await file.copy(copy);
    archive = readInChunks(copy);
  } catch {
    throw new BackupError('Le fichier n’a pas pu être lu. Enregistre-le d’abord sur le téléphone, puis réessaie.');
  } finally {
    deleteQuietly(copy);
  }
  const result = openArchive(archive, schemaVersion());
  if (!result.ok) throw new BackupError(result.error);
  return { ...result.opened, archive };
}

function readInChunks(file: File): Uint8Array {
  const handle = file.open(FileMode.ReadOnly);
  try {
    const bytes = new Uint8Array(handle.size ?? 0);
    let offset = 0;
    while (offset < bytes.length) {
      const chunk = handle.readBytes(Math.min(READ_CHUNK, bytes.length - offset));
      if (chunk.length === 0) break;
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes.subarray(0, offset);
  } finally {
    handle.close();
  }
}

/**
 * Replaces everything on this phone with the backup. Photos are extracted to
 * a staging folder first, then all rows are replaced in one transaction: if
 * anything fails before the end, the phone is left as it was.
 */
export async function restoreBackup({ backup, archive, photoFiles }: PickedBackup): Promise<void> {
  const tables = prepareImport(backup, photoFiles, (id) => photoFile(id).uri);
  const photoIds = tables.photos.map((photo) => String(photo.id));
  const staging = stagingDirectory();
  deleteQuietly(staging);
  staging.create({ intermediates: true });
  try {
    for (let start = 0; start < photoIds.length; start += EXTRACT_BATCH) {
      const batch = photoIds.slice(start, start + EXTRACT_BATCH);
      const files = extractPhotos(archive, batch);
      for (const id of batch) {
        const bytes = files.get(id);
        if (!bytes) throw new Error(`Photo ${id} is missing from the archive`);
        new File(staging, `${id}.jpg`).write(bytes);
      }
      // Let the spinner turn between batches.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    replaceRows(tables);
    try {
      installPhotos(staging, photoIds);
    } catch {
      // The rows are committed: from here on, a file problem only costs pictures.
    }
  } finally {
    deleteQuietly(staging);
  }
  notify(...BACKUP_TABLES);
}

function replaceRows(tables: BackupTables) {
  const database = db();
  const columns = new Map(
    BACKUP_TABLES.map((table) => [
      table,
      database.getAllSync<{ name: string }>(`pragma table_info(${table})`).map((column) => column.name),
    ]),
  );
  database.withTransactionSync(() => {
    for (const table of [...BACKUP_TABLES].reverse()) database.runSync(`delete from ${table}`);
    for (const table of BACKUP_TABLES) insertRows(table, tables[table], columns.get(table) ?? []);
  });
}

/** Inserts the columns this phone's table has; the others are ignored, missing ones get their default. */
function insertRows(table: BackupTable, rows: BackupRow[], tableColumns: string[]) {
  const statements = new Map<string, SQLiteStatement>();
  try {
    for (const row of rows) {
      const columns = insertColumns(row, tableColumns);
      const sql = insertSql(table, columns);
      let statement = statements.get(sql);
      if (!statement) {
        statement = db().prepareSync(sql);
        statements.set(sql, statement);
      }
      statement.executeSync(columns.map((column) => row[column]));
    }
  } finally {
    statements.forEach((statement) => statement.finalizeSync());
  }
}

/** Moves the imported photos into place and deletes the files of the replaced ones. */
function installPhotos(staging: Directory, photoIds: string[]) {
  const directory = photosDirectory();
  directory.create({ idempotent: true, intermediates: true });
  for (const id of photoIds) {
    try {
      new File(staging, `${id}.jpg`).moveSync(photoFile(id), { overwrite: true });
    } catch {
      // The row stays, without its picture.
    }
  }
  const kept = new Set(photoIds.map((id) => photoFile(id).name));
  for (const item of directory.list()) {
    if (item instanceof File && !kept.has(item.name)) deleteQuietly(item);
  }
}
