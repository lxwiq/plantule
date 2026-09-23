import type { Task } from '@/db/types';

import { addDays, toDateString, today } from './dates';

export function isDoneToday(task: Task, day = today()): boolean {
  return !!task.last_done_at && toDateString(new Date(task.last_done_at)) === day;
}

export type TaskGroups = {
  overdue: Task[];
  dueToday: Task[];
  /** Done today, and not due again today. */
  doneToday: Task[];
  /** Due in the next `upcomingDays` days. */
  upcoming: Task[];
};

export function byDueDate(a: Task, b: Task) {
  return a.next_due_on.localeCompare(b.next_due_on) || a.created_at.localeCompare(b.created_at);
}

/** Splits tasks for the Today screen, soonest first. */
export function groupTasks(tasks: Task[], day = today(), upcomingDays = 7): TaskGroups {
  const horizon = addDays(day, upcomingDays);
  const groups: TaskGroups = { overdue: [], dueToday: [], doneToday: [], upcoming: [] };
  for (const task of [...tasks].sort(byDueDate)) {
    if (task.next_due_on < day) groups.overdue.push(task);
    else if (task.next_due_on === day) groups.dueToday.push(task);
    else if (isDoneToday(task, day)) groups.doneToday.push(task);
    else if (task.next_due_on <= horizon) groups.upcoming.push(task);
  }
  return groups;
}
