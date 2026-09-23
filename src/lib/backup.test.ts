import { describe, expect, it } from '@jest/globals';
import { strToU8, zipSync } from 'fflate';

import {
  BACKUP_ERRORS,
  BACKUP_TABLES,
  backupFileName,
  buildBackup,
  createArchive,
  describeBackup,
  extractPhotos,
  formatLastBackup,
  insertColumns,
  insertSql,
  openArchive,
  parseBackup,
  photoEntryName,
  photoIdOfEntry,
  prepareImport,
  summarizeBackup,
  type Backup,
  type BackupTables,
} from './backup';

const SCHEMA = 3;

function tables(overrides: Partial<BackupTables> = {}): BackupTables {
  const empty = Object.fromEntries(BACKUP_TABLES.map((t) => [t, []])) as unknown as BackupTables;
  return {
    ...empty,
    places: [
      { id: 'place-b', name: 'Campagne', created_at: '2026-05-01T10:00:00.000Z' },
      { id: 'place-a', name: 'Appart', created_at: '2026-01-01T10:00:00.000Z' },
    ],
    plants: [
      { id: 'plant-1', place_id: 'place-a', nickname: 'Monstera', main_photo_id: 'photo-1' },
      { id: 'plant-2', place_id: 'place-a', nickname: 'Pothos', main_photo_id: 'photo-2' },
    ],
    photos: [
      { id: 'photo-1', plant_id: 'plant-1', uri: 'file:///old/photos/photo-1.jpg', created_at: '2026-02-01' },
      { id: 'photo-2', plant_id: 'plant-2', uri: 'file:///old/photos/photo-2.jpg', created_at: '2026-02-02' },
    ],
    diagnoses: [
      { id: 'diag-1', plant_id: 'plant-2', photo_id: 'photo-2', status: 'watch', data: '{}' },
      { id: 'diag-2', plant_id: 'plant-1', photo_id: null, status: 'healthy', data: '{}' },
    ],
    settings: [
      { key: 'current_place_id', value: '"place-b"' },
      { key: 'daily_summary_time', value: '"09:30"' },
      { key: 'last_backup_at', value: '"2026-08-01T08:00:00.000Z"' },
    ],
    ...overrides,
  };
}

function backup(overrides: Partial<Backup> = {}): Backup {
  return {
    ...buildBackup({
      tables: tables(),
      schemaVersion: SCHEMA,
      exportedAt: '2026-09-12T18:30:00.000Z',
      appVersion: '1.0.0',
    }),
    ...overrides,
  };
}

const json = (value: unknown) => JSON.stringify(value);

describe('backup manifest', () => {
  it('reads back what was built', () => {
    const built = backup();
    expect(parseBackup(json(built), SCHEMA)).toEqual({ ok: true, backup: built });
  });

  it('names the file after the local day', () => {
    expect(backupFileName(new Date(2026, 8, 23, 23, 50))).toBe('plantule-sauvegarde-2026-09-23.zip');
  });

  it('refuses what is not a Plantule backup', () => {
    for (const text of ['', 'not json', '[]', json({ format: 'other' }), json({ ...backup(), format: 'x' })]) {
      expect(parseBackup(text, SCHEMA)).toEqual({ ok: false, error: BACKUP_ERRORS.invalid });
    }
  });

  it('refuses a damaged manifest', () => {
    const damaged = [
      { ...backup(), exported_at: 'hier' },
      { ...backup(), schema_version: 0 },
      { ...backup(), tables: [] },
      { ...backup(), tables: { ...tables(), plants: {} } },
      { ...backup(), tables: { ...tables(), plants: [{ id: 'x', nickname: { nested: true } }] } },
      { ...backup(), tables: { ...tables(), places: [] } },
      { ...backup(), tables: { ...tables(), settings: [{ key: 'daily_summary_time', value: '08:00' }] } },
      { ...backup(), tables: { ...tables(), settings: [{ key: null, value: '"08:00"' }] } },
    ];
    for (const value of damaged) {
      expect(parseBackup(json(value), SCHEMA)).toEqual({ ok: false, error: BACKUP_ERRORS.invalid });
    }
  });

  it('refuses a backup from a newer schema or file format', () => {
    expect(parseBackup(json(backup({ schema_version: SCHEMA + 1 })), SCHEMA)).toEqual({
      ok: false,
      error: BACKUP_ERRORS.newer,
    });
    expect(parseBackup(json(backup({ version: 2 })), SCHEMA)).toEqual({ ok: false, error: BACKUP_ERRORS.newer });
  });

  it('accepts an older schema, with missing tables as empty', () => {
    const { diagnoses, chat_messages, ...older } = tables();
    const result = parseBackup(json({ ...backup(), schema_version: 1, tables: older }), SCHEMA);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.tables.diagnoses).toEqual([]);
      expect(result.backup.tables.chat_messages).toEqual([]);
      expect(result.backup.tables.plants).toHaveLength(2);
    }
  });

  it('ignores tables this app does not know', () => {
    const result = parseBackup(json({ ...backup(), tables: { ...tables(), wishlist: [{ id: 1 }] } }), SCHEMA);
    expect(result.ok && Object.keys(result.backup.tables)).toEqual([...BACKUP_TABLES]);
  });
});

describe('photo entries', () => {
  it('maps photo ids to archive entries and back', () => {
    expect(photoEntryName('0c9e4f5a-1b2c')).toBe('photos/0c9e4f5a-1b2c.jpg');
    expect(photoIdOfEntry('photos/0c9e4f5a-1b2c.jpg')).toBe('0c9e4f5a-1b2c');
  });

  it('ignores other entries and unsafe names', () => {
    for (const name of ['plantule.json', 'photos/', 'photos/a.png', 'photos/../../x.jpg', 'photos/a/b.jpg', 'x/a.jpg']) {
      expect(photoIdOfEntry(name)).toBeNull();
    }
  });
});

describe('import preparation', () => {
  const uri = (id: string) => `file:///new/photos/${id}.jpg`;

  it('points photos at this phone', () => {
    const prepared = prepareImport(backup(), new Set(['photo-1', 'photo-2']), uri);
    expect(prepared.photos.map((p) => p.uri)).toEqual([uri('photo-1'), uri('photo-2')]);
    expect(prepared.photos[0]).toMatchObject({ id: 'photo-1', plant_id: 'plant-1', created_at: '2026-02-01' });
  });

  it('drops a photo without its file and clears what referred to it', () => {
    const prepared = prepareImport(backup(), new Set(['photo-1']), uri);
    expect(prepared.photos.map((p) => p.id)).toEqual(['photo-1']);
    expect(prepared.plants.map((p) => p.main_photo_id)).toEqual(['photo-1', null]);
    expect(prepared.diagnoses.map((d) => d.photo_id)).toEqual([null, null]);
  });

  it('clears a main photo that is not in the backup at all', () => {
    const data = tables({ plants: [{ id: 'plant-1', place_id: 'place-a', nickname: 'M', main_photo_id: 'gone' }] });
    const prepared = prepareImport(backup({ tables: data }), new Set(['photo-1', 'gone']), uri);
    expect(prepared.plants[0].main_photo_id).toBeNull();
  });

  it('keeps the settings, with the imported backup as the last one', () => {
    const prepared = prepareImport(backup(), new Set(), uri);
    const settings = Object.fromEntries(prepared.settings.map((s) => [s.key, JSON.parse(String(s.value))]));
    expect(settings).toEqual({
      current_place_id: 'place-b',
      daily_summary_time: '09:30',
      last_backup_at: '2026-09-12T18:30:00.000Z',
    });
  });

  it('shows the oldest place when the one shown is missing', () => {
    for (const settings of [[], [{ key: 'current_place_id', value: '"deleted"' }], [{ key: 'current_place_id', value: 'oops' }]]) {
      const prepared = prepareImport(backup({ tables: tables({ settings }) }), new Set(), uri);
      const row = prepared.settings.find((s) => s.key === 'current_place_id');
      expect(row?.value).toBe('"place-a"');
    }
  });

  it('leaves the other tables as they are', () => {
    const data = tables({ tasks: [{ id: 't', plant_id: 'plant-1', kind: 'water', interval_days: 7 }] });
    expect(prepareImport(backup({ tables: data }), new Set(), uri).tasks).toEqual(data.tasks);
  });
});

describe('column filtering', () => {
  const columns = ['id', 'plant_id', 'uri', 'created_at', 'taken_at'];

  it('inserts the columns both sides know, in the table order', () => {
    const row = { created_at: '2026-02-01', uri: 'u', id: 'p', plant_id: 'x', old_column: 1 };
    expect(insertColumns(row, columns)).toEqual(['id', 'plant_id', 'uri', 'created_at']);
  });

  it('keeps null values', () => {
    expect(insertColumns({ id: 'p', taken_at: null }, columns)).toEqual(['id', 'taken_at']);
  });

  it('builds the insert statement', () => {
    expect(insertSql('photos', ['id', 'uri'])).toBe('insert into "photos" ("id", "uri") values (?, ?)');
    expect(insertSql('settings', [])).toBe('insert into "settings" default values');
  });
});

describe('summary', () => {
  it('counts places, plants and the photos that come with a file', () => {
    const summary = summarizeBackup(backup(), new Set(['photo-2', 'stray']));
    expect(summary).toEqual({ exportedAt: '2026-09-12T18:30:00.000Z', places: 2, plants: 2, photos: 1 });
  });

  it('describes the backup in French', () => {
    const summary = { exportedAt: new Date(2026, 8, 12, 20).toISOString(), places: 1, plants: 14, photos: 0 };
    expect(describeBackup(summary)).toMatch(/^Sauvegarde du 12 septembre( 2026)? : 1 lieu, 14 plantes et 0 photo\.$/);
    expect(describeBackup({ ...summary, places: 2, photos: 3 })).toContain('2 lieux, 14 plantes et 3 photos');
  });

  it('formats the last backup day', () => {
    const at = (day: number) => new Date(2026, 8, day, 21, 15).toISOString();
    expect(formatLastBackup(null, '2026-09-23')).toBe('jamais');
    expect(formatLastBackup(at(23), '2026-09-23')).toBe('aujourd’hui');
    expect(formatLastBackup(at(22), '2026-09-23')).toBe('hier');
    expect(formatLastBackup(at(12), '2026-09-23')).toMatch(/^12 septembre/);
  });
});

describe('archive', () => {
  const jpeg = (seed: number) => Uint8Array.from({ length: 5000 }, (_, i) => (i * seed) % 256);

  function archive(photos: Record<string, Uint8Array>, data = backup()): Uint8Array {
    const chunks: Uint8Array[] = [];
    const writer = createArchive((chunk) => chunks.push(chunk));
    writer.addManifest(data);
    for (const [id, bytes] of Object.entries(photos)) writer.addPhoto(id, bytes);
    writer.end();
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  it('reads back the manifest and the photos it was written with', () => {
    const zip = archive({ 'photo-1': jpeg(7), 'photo-2': jpeg(13) });
    const result = openArchive(zip, SCHEMA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.opened.backup).toEqual(backup());
    expect([...result.opened.photoFiles]).toEqual(['photo-1', 'photo-2']);
    expect(result.opened.summary.photos).toBe(2);

    const photos = extractPhotos(zip, ['photo-2']);
    expect([...photos.keys()]).toEqual(['photo-2']);
    expect(photos.get('photo-2')).toEqual(jpeg(13));
  });

  it('counts only the photos whose file made it into the archive', () => {
    const result = openArchive(archive({ 'photo-2': jpeg(3) }), SCHEMA);
    expect(result.ok && result.opened.summary).toMatchObject({ places: 2, plants: 2, photos: 1 });
  });

  it('refuses a file that is not a zip, or a zip without the manifest', () => {
    const invalid = { ok: false, error: BACKUP_ERRORS.invalid };
    expect(openArchive(strToU8('hello'), SCHEMA)).toEqual(invalid);
    expect(openArchive(new Uint8Array(0), SCHEMA)).toEqual(invalid);
    expect(openArchive(zipSync({ 'notes.txt': strToU8('hi') }), SCHEMA)).toEqual(invalid);
  });

  it('refuses a newer backup before extracting anything', () => {
    const zip = archive({}, backup({ schema_version: SCHEMA + 1 }));
    expect(openArchive(zip, SCHEMA)).toEqual({ ok: false, error: BACKUP_ERRORS.newer });
  });
});
