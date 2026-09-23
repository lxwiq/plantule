/**
 * The care written to the phone's calendar: one all-day event per day with
 * care, from today on, projected like the month calendar (see calendar.ts).
 * The app owns that calendar, so each sync compares what is there with what
 * should be, and only rewrites the days that changed.
 */

import type { Plant, Task } from '@/db/types';

import { projectTasks, type Occurrence } from './calendar';
import { addDays } from './dates';
import { TASK_KIND_ORDER, taskTitle } from './labels';
import { summaryFor } from './summary';

/** Days written ahead, like the daily summary; opening the app pushes the horizon further. */
export const AGENDA_DAYS = 30;

export type AgendaEvent = {
  /** "YYYY-MM-DD" */
  day: string;
  /** "3 plantes à arroser", as in the daily summary. */
  title: string;
  /** One line per care: "Arroser : Monstera, Ficus (en retard)". */
  notes: string;
};

/** An event found in the phone's calendar. */
export type StoredEvent = AgendaEvent & { id: string };

/**
 * One line per care, watering first; late plants first, then by name. The
 * order depends only on what is planned, so that a day is rewritten only
 * when its care changes.
 */
function notesFor(occurrences: Occurrence[], names: Map<string, string>): string {
  const planned = occurrences
    .filter((o) => names.has(o.task.plant_id))
    .map((o) => ({ ...o, name: names.get(o.task.plant_id)! }))
    .sort(
      (a, b) =>
        TASK_KIND_ORDER.indexOf(a.task.kind) - TASK_KIND_ORDER.indexOf(b.task.kind) ||
        Number(b.late) - Number(a.late) ||
        a.name.localeCompare(b.name, 'fr'),
    );
  const lines = new Map<string, string[]>();
  for (const { task, late, name } of planned) {
    const title = taskTitle(task);
    lines.set(title, [...(lines.get(title) ?? []), late ? `${name} (en retard)` : name]);
  }
  return [...lines].map(([title, plantNames]) => `${title} : ${plantNames.join(', ')}`).join('\n');
}

/** The events for the `days` days from `today`, one per day with care. */
export function agendaEvents(tasks: Task[], plants: Plant[], today: string, days = AGENDA_DAYS): AgendaEvent[] {
  const names = new Map(plants.map((p) => [p.id, p.nickname]));
  const planned = projectTasks(
    tasks.filter((t) => names.has(t.plant_id)),
    today,
    addDays(today, days - 1),
    today,
  );
  return [...planned]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([day, occurrences]) => {
      // Every task planned on a day was due by then: the daily summary counts it.
      const summary = summaryFor(day, occurrences.map((o) => o.task), plants);
      return summary ? [{ day, title: summary.title, notes: notesFor(occurrences, names) }] : [];
    });
}

/**
 * What to change in the calendar so that, from `today` on, it holds exactly
 * `wanted`. Past days are left as they were written.
 */
export function agendaChanges(stored: StoredEvent[], wanted: AgendaEvent[], today: string) {
  const missing = new Map(wanted.map((event) => [event.day, event]));
  const remove: string[] = [];
  for (const event of stored) {
    if (event.day < today) continue;
    const match = missing.get(event.day);
    if (match && match.title === event.title && match.notes === event.notes) missing.delete(event.day);
    else remove.push(event.id);
  }
  return { remove, add: [...missing.values()] };
}

/**
 * The day of an all-day event: all-day events run from midnight to midnight
 * UTC, which the middle of the event keeps whatever the phone's time zone.
 */
export function eventDay(start: string | Date, end: string | Date): string {
  const middle = (new Date(start).getTime() + new Date(end).getTime()) / 2;
  return new Date(middle).toISOString().slice(0, 10);
}

/** Start and end of an all-day event on `day`, as the calendar expects them: UTC midnights. */
export function allDayRange(day: string): { startDate: Date; endDate: Date } {
  const [year, month, date] = day.split('-').map(Number);
  return {
    startDate: new Date(Date.UTC(year, month - 1, date)),
    endDate: new Date(Date.UTC(year, month - 1, date + 1)),
  };
}
