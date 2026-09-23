import type { Plant, Task } from '@/db/types';

/** The message for a day: tasks due that day or overdue. */
export function summaryFor(day: string, tasks: Task[], plants: Plant[]) {
  const due = tasks.filter((task) => task.next_due_on <= day);
  if (due.length === 0) return null;

  const water = due.filter((t) => t.kind === 'water').length;
  const others = due.length - water;
  let title: string;
  if (others === 0) {
    title = water === 1 ? '1 plante à arroser' : `${water} plantes à arroser`;
  } else if (water > 0) {
    title = `${water} à arroser, ${others} autre${others > 1 ? 's' : ''} soin${others > 1 ? 's' : ''}`;
  } else {
    title = due.length === 1 ? '1 soin à faire' : `${due.length} soins à faire`;
  }

  const plantIds = new Set(due.map((t) => t.plant_id));
  const names = plants.filter((p) => plantIds.has(p.id)).map((p) => p.nickname);
  const shown = names.slice(0, 3).join(', ');
  const rest = names.length - 3;
  const body = rest > 0 ? `${shown} et ${rest} autre${rest > 1 ? 's' : ''}` : shown;
  return { title, body };
}
