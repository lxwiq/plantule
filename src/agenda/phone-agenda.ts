/**
 * The care in the phone's calendar: an agenda « Plantule » owned by the app,
 * with one all-day event per day with care over the coming weeks (see
 * src/lib/agenda.ts). Rewritten whenever the tasks change, like the daily
 * summary. Turning it off deletes the agenda. Same exports as
 * phone-agenda.web.ts.
 */

import {
  Availability,
  CalendarAccessLevel,
  createCalendar,
  EntityTypes,
  getCalendarPermissions,
  getCalendars,
  requestCalendarPermissions,
  SourceType,
  type ExpoCalendar,
} from 'expo-calendar';

import { updateSettings } from '@/db/repo';
import type { Plant, Task } from '@/db/types';
import { AGENDA_DAYS, agendaChanges, agendaEvents, allDayRange, eventDay } from '@/lib/agenda';
import { addDays, parseDate, today } from '@/lib/dates';
import { palettes } from '@/theme';

/** Android only for now: on iOS, the agenda would need a calendar source of its own. */
export const agendaAvailable = process.env.EXPO_OS === 'android';

// The marks of the app's own agenda: no other calendar is ever changed.
const ACCOUNT_NAME = 'Plantule';
const CALENDAR_NAME = 'plantule_soins';

function isOwn(calendar: ExpoCalendar) {
  return (
    calendar.name === CALENDAR_NAME &&
    calendar.source?.isLocalAccount === true &&
    calendar.source.name === ACCOUNT_NAME
  );
}

async function ownCalendars(): Promise<ExpoCalendar[]> {
  return (await getCalendars(EntityTypes.EVENT)).filter(isOwn);
}

/** A calendar of the phone only, never synced to an online account. */
function createOwnCalendar(): Promise<ExpoCalendar> {
  return createCalendar({
    title: 'Plantule',
    name: CALENDAR_NAME,
    color: palettes.light.primary,
    entityType: EntityTypes.EVENT,
    source: { isLocalAccount: true, name: ACCOUNT_NAME, type: SourceType.LOCAL },
    ownerAccount: ACCOUNT_NAME,
    accessLevel: CalendarAccessLevel.OWNER,
  });
}

export async function agendaPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!agendaAvailable) return 'denied';
  return (await getCalendarPermissions()).status;
}

/**
 * Asks for the calendar, then creates the agenda (or finds it again) and
 * turns the feature on; the events follow with the next sync. Returns the
 * permission when it is refused.
 */
export async function enableAgenda(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const permission = await requestCalendarPermissions();
  if (!permission.granted) return permission;
  const calendar = (await ownCalendars())[0] ?? (await createOwnCalendar());
  updateSettings({ agenda_enabled: true, agenda_calendar_id: calendar.id });
  return permission;
}

/** Turns the feature off and deletes the agenda with its events. */
export async function disableAgenda() {
  updateSettings({ agenda_enabled: false, agenda_calendar_id: null });
  await syncAgenda({ enabled: false, calendarId: null, tasks: [], plants: [] });
}

type AgendaInput = {
  enabled: boolean;
  calendarId: string | null;
  /** The place shown, as in the month calendar. */
  tasks: Task[];
  plants: Plant[];
};

async function syncOnce({ enabled, calendarId, tasks, plants }: AgendaInput) {
  if (!agendaAvailable || (await agendaPermission()) !== 'granted') return;
  const own = await ownCalendars();
  if (!enabled) {
    for (const calendar of own) await calendar.delete();
    return;
  }

  // One agenda: the one saved in the settings, else one found again (after a
  // backup from another phone, for instance), else a new one.
  const calendar = own.find((c) => c.id === calendarId) ?? own[0] ?? (await createOwnCalendar());
  for (const extra of own) if (extra.id !== calendar.id) await extra.delete();
  if (calendar.id !== calendarId) updateSettings({ agenda_calendar_id: calendar.id });

  const day = today();
  const found = await calendar.listEvents(parseDate(addDays(day, -1)), parseDate(addDays(day, AGENDA_DAYS + 1)));
  const { remove, add } = agendaChanges(
    found.map((e) => ({ id: e.id, day: eventDay(e.startDate, e.endDate), title: e.title, notes: e.notes ?? '' })),
    agendaEvents(tasks, plants, day),
    day,
  );
  for (const event of found) if (remove.includes(event.id)) await event.delete();
  for (const event of add) {
    await calendar.createEvent({
      title: event.title,
      notes: event.notes,
      ...allDayRange(event.day),
      allDay: true,
      // Android wants all-day events in UTC, from midnight to midnight.
      timeZone: 'UTC',
      endTimeZone: 'UTC',
      availability: Availability.FREE,
    });
  }
}

let running: Promise<void> | null = null;
let pending: AgendaInput | null = null;

/**
 * Brings the agenda in line with the tasks. Safe to call often: only the
 * days that changed are rewritten, and calls made during a sync are merged
 * into one more, with the latest data.
 */
export function syncAgenda(input: AgendaInput): Promise<void> {
  pending = input;
  running ??= (async () => {
    try {
      while (pending) {
        const next = pending;
        pending = null;
        await syncOnce(next).catch(() => undefined);
      }
    } finally {
      running = null;
    }
  })();
  return running;
}
