/**
 * The widget's data, read from the database by the background task that
 * draws the widget, even when the app is closed. It uses a connection of its
 * own, only reads, and never migrates: the columns it needs exist in every
 * version of the schema.
 */

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME } from '@/db/database';
import type { Place, Plant, Task } from '@/db/types';
import { suggestedInterval } from '@/lib/schedule';

import type { WidgetData } from './today-widget';

/** The place shown in the app, as in repo.ts; null before the app's first launch. */
export function readWidgetData(): WidgetData | null {
  let db: SQLiteDatabase | null = null;
  try {
    db = openDatabaseSync(DATABASE_NAME, { useNewConnection: true });
    const setting = db.getFirstSync<{ value: string }>(`select value from settings where key = 'current_place_id'`);
    const currentId: unknown = setting ? JSON.parse(setting.value) : null;
    const places = db.getAllSync<Place>('select * from places order by created_at');
    const place = places.find((p) => p.id === currentId) ?? places[0];
    if (!place) return null;

    const plants = db.getAllSync<Plant>(
      'select *, null as main_photo_uri from plants where place_id = ? order by nickname collate nocase',
      place.id,
    );
    const tasks = db
      .getAllSync<Omit<Task, 'suggested_interval_days'>>(
        `select t.* from tasks t join plants p on p.id = t.plant_id
         where p.place_id = ? order by t.next_due_on, t.created_at`,
        place.id,
      )
      .map((row) => ({ ...row, suggested_interval_days: suggestedInterval(row.interval_days, row.wet_streak, row.wet_days) }));
    return { placeName: place.name, tasks, plants };
  } catch {
    // No tables yet: the app was never opened.
    return null;
  } finally {
    db?.closeSync();
  }
}
