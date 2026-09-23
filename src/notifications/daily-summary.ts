/**
 * The daily summary: one local notification a day, at the chosen time
 * ("3 plantes à arroser"). Notifications are scheduled for the coming weeks
 * from the tasks on the phone, and rescheduled whenever they change.
 */

import * as Notifications from 'expo-notifications';

import type { Plant, Settings, Task } from '@/db/types';
import { addDays, parseDate, today } from '@/lib/dates';
import { summaryFor } from '@/lib/summary';

const CHANNEL_ID = 'daily-summary';
const ID_PREFIX = 'daily-summary-';
/** Days scheduled ahead; opening the app pushes the horizon further. */
const DAYS_AHEAD = 30;

const supported = process.env.EXPO_OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (process.env.EXPO_OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Résumé quotidien',
    description: 'Les plantes à soigner dans la journée',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function notificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!supported) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  await ensureChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function clearDailySummary() {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Reschedules the coming summaries. Safe to call often. */
export async function syncDailySummary({
  settings,
  tasks,
  plants,
}: {
  settings: Settings;
  tasks: Task[];
  plants: Plant[];
}) {
  if (!supported) return;
  await clearDailySummary();
  if (!settings.daily_summary_enabled) return;
  if ((await notificationPermission()) !== 'granted') return;
  await ensureChannel();

  const [hours, minutes] = settings.daily_summary_time.split(':').map(Number);
  const now = new Date();
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const day = addDays(today(), offset);
    const at = parseDate(day);
    at.setHours(hours, minutes, 0, 0);
    if (at <= now) continue;

    const summary = summaryFor(day, tasks, plants);
    if (!summary) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${day}`,
      content: { title: summary.title, body: summary.body, data: { url: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  }
}
