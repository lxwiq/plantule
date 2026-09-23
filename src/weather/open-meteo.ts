/**
 * The app's only requests besides the model download, to Open-Meteo (free,
 * without a key or an account): finding a town by its name, and the rain
 * around a place, which sends nothing but its rounded coordinates.
 */

import {
  forecastUrl,
  geocodingUrl,
  parseForecast,
  parseTowns,
  type Coordinates,
  type RainHour,
  type Town,
} from '@/lib/weather';

const TIMEOUT_MS = 15_000;

/** Fails on a network error, a timeout, `signal` aborting or an HTTP error. */
async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, TIMEOUT_MS);
  signal?.addEventListener('abort', abort);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Open-Meteo: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/** Towns matching a name, most populated first. */
export async function searchTowns(name: string, signal?: AbortSignal): Promise<Town[]> {
  return parseTowns(await getJson(geocodingUrl(name), signal));
}

/** The rainy hours around a place, over the past days and the next two. */
export async function fetchRain(coordinates: Coordinates, signal?: AbortSignal): Promise<RainHour[]> {
  const hours = parseForecast(await getJson(forecastUrl(coordinates), signal));
  if (!hours) throw new Error('Open-Meteo: unexpected answer');
  return hours;
}
