/**
 * What the home-screen widget shows: the care due today in the place shown
 * (overdue included), one row per plant, the plants to water first.
 */

import type { Plant, Task, TaskKind } from '@/db/types';

import { plural, taskTitle } from './labels';
import { summaryFor } from './summary';
import { byDueDate } from './tasks';

export type WidgetRow = {
  plantId: string;
  name: string;
  /** What to do, kept short: "Arroser", "Arroser · Brumiser", "3 soins". */
  care: string;
  /** The first care's kind, for the row's color. */
  kind: TaskKind;
  /** One of its tasks is overdue. */
  late: boolean;
};

export type WidgetContent = {
  /** "3 plantes à arroser", as in the daily summary, or "Rien à faire aujourd’hui". */
  title: string;
  rows: WidgetRow[];
  /** "+2 autres" when not every plant fits. */
  more: string | null;
  /** Shown instead of rows when there is nothing to do. */
  message: string | null;
  /** Plants with overdue care. */
  late: number;
};

/** Watering first, then the most overdue. */
function byWateringFirst(a: Task, b: Task) {
  return Number(a.kind !== 'water') - Number(b.kind !== 'water') || byDueDate(a, b);
}

/** Longest care text on a row, so that the plant's name keeps its room. */
const CARE_LENGTH = 24;

function careText(tasks: Task[]): string {
  const text = tasks.map(taskTitle).join(' · ');
  if (text.length <= CARE_LENGTH) return text;
  return tasks.length > 1 ? plural(tasks.length, 'soin') : `${text.slice(0, CARE_LENGTH - 1).trimEnd()}…`;
}

/**
 * The widget's content for `day`, with at most `maxRows` lines under the
 * title: when plants do not fit, the last line says how many are left.
 */
export function widgetContent(tasks: Task[], plants: Plant[], day: string, maxRows: number): WidgetContent {
  const names = new Map(plants.map((p) => [p.id, p.nickname]));
  const due = tasks.filter((t) => t.next_due_on <= day && names.has(t.plant_id)).sort(byWateringFirst);
  const summary = summaryFor(day, due, plants);
  if (!summary) {
    return {
      title: 'Rien à faire aujourd’hui',
      rows: [],
      more: null,
      message: plants.length > 0 ? 'Toutes les plantes sont à jour.' : 'Ajoute tes plantes dans Plantule.',
      late: 0,
    };
  }

  const byPlant = new Map<string, Task[]>();
  for (const task of due) byPlant.set(task.plant_id, [...(byPlant.get(task.plant_id) ?? []), task]);
  const all: WidgetRow[] = [...byPlant].map(([plantId, list]) => ({
    plantId,
    name: names.get(plantId)!,
    care: careText(list),
    kind: list[0].kind,
    late: list.some((t) => t.next_due_on < day),
  }));

  const fits = all.length <= maxRows;
  const rows = fits ? all : all.slice(0, Math.max(maxRows - 1, 0));
  const left = all.length - rows.length;
  return {
    title: summary.title,
    rows,
    more: !fits && maxRows > 0 ? `+${left} autre${left > 1 ? 's' : ''}` : null,
    message: null,
    late: all.filter((r) => r.late).length,
  };
}
