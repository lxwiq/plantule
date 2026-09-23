/**
 * Rain for outdoor plants, from Open-Meteo (free, without a key or an
 * account). Everything here is pure: the requests are in
 * src/weather/open-meteo.ts, the database work in src/db/repo.ts.
 *
 * The rule: a watering task of a plant in an outdoor room, due today or
 * overdue, counts as done by the rain when a day since it was last done (since
 * the day it was created, if never done) got at least RAIN_THRESHOLD_MM. The
 * most recent such day stands for the watering: the rolling recurrence
 * restarts from it. Nothing happens when the next watering, counted from that
 * day, would already be due: the rain is too old to spare one. Only rain that
 * has fallen counts; rain still to come today is only a hint on the Today
 * screen.
 */

import type { Task, TaskKind } from '@/db/types';

import { addDays, formatRelativeDay, toDateString } from './dates';
import { nextDueAfterDone } from './schedule';

/**
 * Rain that waters a pot, in a day. 5 mm is 5 litres per m²: the usual line
 * between a shower that only wets the leaves and the top of the soil, and a
 * rain that soaks into it (a 30 cm pot catches a third of a litre, more with
 * the leaves funnelling it). Counted per day: drizzle spread over several days
 * evaporates as it falls.
 */
export const RAIN_THRESHOLD_MM = 5;
/** Hours between two forecasts of a place. */
export const WEATHER_REFRESH_HOURS = 3;
/** Past days of rain fetched: longer than most outdoor watering intervals. */
export const RAIN_PAST_DAYS = 14;
/** A forecast older than this says nothing reliable about the rest of the day. */
const FORECAST_MAX_AGE_HOURS = 12;

const HOUR = 3_600_000;

export type Coordinates = { latitude: number; longitude: number };

/** A town found by its name, to place a lieu for the weather. */
export type Town = Coordinates & {
  name: string;
  /** "Loire-Atlantique, France", to tell towns of the same name apart. */
  region: string | null;
};

/** Rain of one hour: `end` is when the hour ends (epoch ms), `mm` what fell during it. */
export type RainHour = { end: number; mm: number };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

// Requests

/** About a kilometre: the forecast grid is coarser, and the place stays vague. */
const roundCoordinate = (value: number) => Math.round(value * 100) / 100;

const query = (params: Record<string, string | number>) =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

/** Towns matching a name, in French. Open-Meteo needs at least 2 letters. */
export function geocodingUrl(name: string): string {
  return `https://geocoding-api.open-meteo.com/v1/search?${query({ name: name.trim(), count: 6, language: 'fr', format: 'json' })}`;
}

/**
 * Hourly rain around a place, for the past days and the next two. Nothing
 * leaves the phone but the rounded coordinates.
 */
export function forecastUrl({ latitude, longitude }: Coordinates): string {
  return `https://api.open-meteo.com/v1/forecast?${query({
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    hourly: 'precipitation',
    past_days: RAIN_PAST_DAYS,
    forecast_days: 2,
    timezone: 'auto',
    timeformat: 'unixtime',
  })}`;
}

/** The towns of a geocoding answer; anything malformed is left out. */
export function parseTowns(value: unknown): Town[] {
  if (!isObject(value) || !Array.isArray(value.results)) return [];
  return value.results.flatMap((result): Town[] => {
    if (!isObject(result)) return [];
    const name = text(result.name);
    const { latitude, longitude } = result;
    if (!name || !isNumber(latitude) || !isNumber(longitude)) return [];
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    const region = [text(result.admin2) ?? text(result.admin1), text(result.country)].filter(Boolean).join(', ');
    return [{ name, region: region || null, latitude, longitude }];
  });
}

/**
 * The rainy hours of a forecast answer, or null when it is not one. Open-Meteo
 * gives, at each hour, the rain of the hour before it.
 */
export function parseForecast(value: unknown): RainHour[] | null {
  if (!isObject(value) || !isObject(value.hourly)) return null;
  const { time, precipitation } = value.hourly;
  if (!Array.isArray(time) || !Array.isArray(precipitation) || time.length !== precipitation.length) return null;
  const hours: RainHour[] = [];
  for (let i = 0; i < time.length; i++) {
    const at = time[i];
    const mm = precipitation[i];
    if (!isNumber(at)) return null;
    // A missing value (null) is no rain known.
    if (isNumber(mm) && mm > 0) hours.push({ end: at * 1000, mm });
  }
  return hours;
}

/** Whether the forecast of a place should be fetched again. */
export function weatherIsStale(fetchedAt: string | null | undefined, now = new Date()): boolean {
  if (!fetchedAt) return true;
  const age = now.getTime() - Date.parse(fetchedAt);
  return !(age >= 0 && age < WEATHER_REFRESH_HOURS * HOUR);
}

// Rain by day

/** The local day of the hour that ends at `end`. */
const hourDay = (end: number) => toDateString(new Date(end - HOUR));

const tenths = (mm: number) => Math.round(mm * 10) / 10;

/** Rain fallen each local day, up to `until` (epoch ms): later hours were still a forecast. */
export function rainByDay(hours: RainHour[], until: number): Map<string, number> {
  const days = new Map<string, number>();
  for (const { end, mm } of hours) {
    if (end > until) continue;
    const day = hourDay(end);
    days.set(day, (days.get(day) ?? 0) + mm);
  }
  for (const [day, mm] of days) days.set(day, tenths(mm));
  return days;
}

/**
 * Rain still to come on `day` after `now`, when the forecast is recent enough
 * to tell and it reaches the threshold. Null otherwise.
 */
export function rainExpected(
  forecast: { fetched_at: string; hours: RainHour[] } | null,
  day: string,
  now = new Date(),
): number | null {
  if (!forecast) return null;
  const age = now.getTime() - Date.parse(forecast.fetched_at);
  if (!(age >= 0 && age < FORECAST_MAX_AGE_HOURS * HOUR)) return null;
  const mm = tenths(
    forecast.hours
      .filter((hour) => hour.end > now.getTime() && hourDay(hour.end) === day)
      .reduce((sum, hour) => sum + hour.mm, 0),
  );
  return mm >= RAIN_THRESHOLD_MM ? mm : null;
}

// The rule

/** What the rule reads of a task, and whether its plant is in an outdoor room. */
export type RainTask = Pick<
  Task,
  'id' | 'plant_id' | 'interval_days' | 'winter_factor' | 'last_done_at' | 'next_due_on' | 'created_at'
> & { kind: TaskKind; outdoor: boolean };

/** A watering done by the rain: on `day`, with `mm` of rain; next due on `nextDueOn`. */
export type RainWatering = { taskId: string; plantId: string; day: string; mm: number; nextDueOn: string };

/** The tasks the rain watered, among `tasks` (see the rule at the top). */
export function rainWaterings(tasks: RainTask[], rain: Map<string, number>, today: string): RainWatering[] {
  // Most recent first: the latest rain waters best.
  const rainyDays = [...rain]
    .filter(([day, mm]) => day <= today && mm >= RAIN_THRESHOLD_MM)
    .sort(([a], [b]) => b.localeCompare(a));
  const waterings: RainWatering[] = [];
  for (const task of tasks) {
    if (task.kind !== 'water' || !task.outdoor || task.next_due_on > today) continue;
    // Rain on the day it was done may have fallen before: only the days after count.
    const after = task.last_done_at
      ? toDateString(new Date(task.last_done_at))
      : addDays(toDateString(new Date(task.created_at)), -1);
    const rainy = rainyDays.find(([day]) => day > after);
    if (!rainy) continue;
    const [day, mm] = rainy;
    const nextDueOn = nextDueAfterDone(day, task.interval_days, task.winter_factor);
    if (nextDueOn <= today) continue;
    waterings.push({ taskId: task.id, plantId: task.plant_id, day, mm, nextDueOn });
  }
  return waterings;
}

// Wording

/** "8 mm" */
export function formatRain(mm: number): string {
  return `${Math.max(1, Math.round(mm))} mm`;
}

/** "Il a plu 8 mm hier : 3 plantes d’extérieur arrosées par la pluie." */
export function rainWateredText(mm: number, rainDay: string, plants: number, today: string): string {
  const what = plants > 1 ? `${plants} plantes d’extérieur arrosées` : '1 plante d’extérieur arrosée';
  return `Il a plu ${formatRain(mm)} ${formatRelativeDay(rainDay, today)} : ${what} par la pluie.`;
}

/** "Environ 12 mm d’ici ce soir : attends avant d’arroser tes plantes d’extérieur." */
export function rainExpectedText(mm: number): string {
  return `Environ ${formatRain(mm)} d’ici ce soir : attends avant d’arroser tes plantes d’extérieur.`;
}
