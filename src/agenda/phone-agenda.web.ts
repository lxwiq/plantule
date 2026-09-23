/**
 * The browser build has no phone calendar: the setting is hidden. Same
 * exports as phone-agenda.ts.
 */

import type { Plant, Task } from '@/db/types';

export const agendaAvailable = false;

export const agendaPermission = async (): Promise<'granted' | 'denied' | 'undetermined'> => 'denied';

export const enableAgenda = async () => ({ granted: false, canAskAgain: false });

export const disableAgenda = async () => undefined;

export const syncAgenda = async (_input: {
  enabled: boolean;
  calendarId: string | null;
  tasks: Task[];
  plants: Plant[];
}) => undefined;
