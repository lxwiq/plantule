/**
 * Care scheduling rules.
 *
 * - Rolling recurrence: the next due date counts from when the task was last
 *   done, not from a fixed calendar. Watering two days late shifts the cycle.
 * - Winter adjustment: from November to February the interval is multiplied by
 *   the task's winter factor (plants need less water while dormant).
 * - "Soil still wet": pushes the task back a few days. After it happens twice
 *   in the same cycle, the task suggests a longer interval.
 */

import { addDays, parseDate } from './dates';

/** Days a watering is pushed back when the soil is still wet. */
export const SOIL_WET_DEFAULT_DAYS = 2;
/** Postponements in one cycle after which a longer interval is suggested. */
export const SOIL_WET_SUGGESTION_STREAK = 2;
export const MAX_INTERVAL_DAYS = 730;

/** November to February, when plants rest. */
export function isWinter(date: string): boolean {
  const month = parseDate(date).getMonth() + 1;
  return month === 11 || month === 12 || month === 1 || month === 2;
}

export function effectiveInterval(intervalDays: number, winterFactor: number, from: string): number {
  if (!isWinter(from)) return intervalDays;
  return Math.min(Math.max(Math.round(intervalDays * winterFactor), 1), MAX_INTERVAL_DAYS);
}

export function nextDueAfterDone(doneOn: string, intervalDays: number, winterFactor: number): string {
  return addDays(doneOn, effectiveInterval(intervalDays, winterFactor, doneOn));
}

/**
 * Due date after pushing a task back by `days`, counted from today, or from
 * the current due date if that is later.
 */
export function postpone(currentDue: string, today: string, days: number): string {
  return addDays(currentDue > today ? currentDue : today, days);
}

/** A longer interval to suggest after repeated "soil still wet" postponements. */
export function suggestedInterval(intervalDays: number, wetStreak: number, wetDays: number): number | null {
  if (wetStreak < SOIL_WET_SUGGESTION_STREAK) return null;
  return Math.min(intervalDays + wetDays, MAX_INTERVAL_DAYS);
}
