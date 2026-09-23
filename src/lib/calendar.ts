/**
 * The month calendar: its grid of days, and the care planned on each day,
 * projected from the tasks with the same rules as when they are done on time.
 */

import type { Task } from '@/db/types';

import { addDays, parseDate, toDateString } from './dates';
import { nextDueAfterDone } from './schedule';
import { byDueDate } from './tasks';

/** Weekdays in the grid's order: weeks start on Monday. */
export const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export type CalendarDay = {
  /** "YYYY-MM-DD" */
  day: string;
  /** False for the neighbouring months' days that fill the first and last weeks. */
  inMonth: boolean;
};

/** First day of the month of `day`: months are identified by it. */
export function monthOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function addMonths(month: string, count: number): string {
  const date = parseDate(month);
  return toDateString(new Date(date.getFullYear(), date.getMonth() + count, 1));
}

/**
 * The weeks of a month, Monday first, filled with the end of the previous
 * month and the start of the next one: 4 to 6 weeks.
 */
export function monthGrid(month: string): CalendarDay[][] {
  const first = parseDate(monthOf(month));
  const leading = (first.getDay() + 6) % 7;
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const start = addDays(toDateString(first), -leading);
  const prefix = month.slice(0, 7);
  return Array.from({ length: Math.ceil((leading + length) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = addDays(start, week * 7 + weekday);
      return { day, inMonth: day.startsWith(prefix) };
    }),
  );
}

/** A task planned on a day. */
export type Occurrence = {
  task: Task;
  day: string;
  /** Overdue: shown today, where it should have been done already. */
  late: boolean;
};

/** Late care first, then as the Today screen sorts tasks. */
function byOccurrence(a: Occurrence, b: Occurrence) {
  return Number(b.late) - Number(a.late) || byDueDate(a.task, b.task) || a.task.id.localeCompare(b.task.id);
}

/**
 * The care planned each day from `from` to `to` included. A task comes first
 * on its due date, or today when it is overdue, then once every interval
 * after, lengthened in winter as if each time were done on the day.
 */
export function projectTasks(tasks: Task[], from: string, to: string, today: string): Map<string, Occurrence[]> {
  const byDay = new Map<string, Occurrence[]>();
  for (const task of tasks) {
    const late = task.next_due_on < today;
    let day = late ? today : task.next_due_on;
    while (day <= to) {
      if (day >= from) {
        const list = byDay.get(day) ?? [];
        list.push({ task, day, late: late && day === today });
        byDay.set(day, list);
      }
      day = nextDueAfterDone(day, task.interval_days, task.winter_factor);
    }
  }
  for (const list of byDay.values()) list.sort(byOccurrence);
  return byDay;
}
