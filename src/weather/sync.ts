/**
 * Keeps the rain of each place with a town up to date, when the app opens or
 * comes back to the foreground, then lets it water the outdoor plants (the
 * rule is in src/lib/weather.ts). Without network, or when Open-Meteo fails,
 * nothing changes and nothing is said.
 *
 * Notifications are scheduled ahead: the rain only counts once the app has
 * been opened. The daily summary is then rescheduled like after any change.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getPlace, getWeather, listPlaces, saveWeather, waterWithRain } from '@/db/repo';
import type { Place } from '@/db/types';
import { weatherIsStale } from '@/lib/weather';

import { fetchRain } from './open-meteo';

let running: Promise<void> | null = null;

/** Fetches the rain of the places whose forecast is old, and applies it. Never fails. */
export function refreshWeather(): Promise<void> {
  running ??= refreshAll().finally(() => {
    running = null;
  });
  return running;
}

async function refreshAll() {
  for (const place of listPlaces()) {
    try {
      await refreshPlace(place);
    } catch {
      // Left as it was: the next opening tries again.
    }
  }
}

async function refreshPlace({ id, latitude, longitude }: Place) {
  if (latitude === null || longitude === null) return;
  if (weatherIsStale(getWeather(id)?.fetched_at)) {
    try {
      const fetchedAt = new Date().toISOString();
      const hours = await fetchRain({ latitude, longitude });
      // The place may have moved, or gone, while waiting.
      const current = getPlace(id);
      if (current?.latitude !== latitude || current.longitude !== longitude) return;
      saveWeather(id, fetchedAt, hours);
    } catch {
      // Offline, or Open-Meteo is down: the rain already known still counts.
    }
  }
  waterWithRain(id);
}

/** Refreshes the weather now, then each time the app comes back to the foreground. */
export function useWeatherRefresh() {
  useEffect(() => {
    void refreshWeather();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshWeather();
    });
    return () => subscription.remove();
  }, []);
}
