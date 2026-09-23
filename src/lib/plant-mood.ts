/**
 * The face a plant's pot makes in its drawing, from what the app knows of it:
 * its care and its latest diagnosis.
 */

import type { Mood } from '@/art/types';
import type { DiagnosisRecord, Task } from '@/db/types';

import { addDays, toDateString, today } from './dates';
import { isDoneToday } from './tasks';

/** How long a diagnosis asking for a treatment keeps the plant worried, in days. */
export const WORRIED_DAYS = 30;

/** What the mood reads of a plant's latest diagnosis. */
export type LatestDiagnosis = Pick<DiagnosisRecord, 'status' | 'created_at'>;

/**
 * The mood of a plant from its tasks and its latest diagnosis, the first that
 * applies:
 * - thirsty: a watering is overdue (due before today);
 * - worried: its latest diagnosis says to treat it, and is less than
 *   WORRIED_DAYS old (a newer diagnosis, or time, ends the worry);
 * - joy: some care was done today;
 * - happy otherwise.
 */
export function plantMood(
  tasks: readonly Task[],
  diagnosis?: LatestDiagnosis | null,
  day = today(),
): Mood {
  if (tasks.some((task) => task.kind === 'water' && task.next_due_on < day)) return 'thirsty';
  if (
    diagnosis?.status === 'treat' &&
    toDateString(new Date(diagnosis.created_at)) > addDays(day, -WORRIED_DAYS)
  ) {
    return 'worried';
  }
  if (tasks.some((task) => isDoneToday(task, day))) return 'joy';
  return 'happy';
}
