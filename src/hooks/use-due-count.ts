import { useCurrentPlace, useTasks } from '@/db/hooks';
import { today } from '@/lib/dates';

/** Number of tasks due today or overdue, shown on the Today tab. */
export function useDueCount() {
  const place = useCurrentPlace();
  const tasks = useTasks(place.id);
  const now = today();
  return tasks.filter((t) => t.next_due_on <= now).length;
}
