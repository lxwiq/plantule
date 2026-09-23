/** Dates of a plant's photos: when they were taken, and how the plant grew since. */

import type { Photo } from '@/db/types';

import { daysBetween, formatElapsed, formatMonth, parseDate, toDateString } from './dates';

/** The local day a photo was taken. */
export function photoDay(photo: Pick<Photo, 'taken_at'>): string {
  return toDateString(new Date(photo.taken_at));
}

/**
 * When a photo was taken, as an instant, from its EXIF data:
 * DateTimeOriginal is "2026:03:14 10:22:05" in the camera's local time.
 * Null when missing or implausible.
 */
export function exifTakenAt(exif: Record<string, unknown> | null | undefined, now = new Date()): string | null {
  const value = exif?.DateTimeOriginal;
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [year, month, day, hours, minutes, seconds] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  // Unset camera clocks write zeros or dates from the 1970s; a date ahead is a wrong clock too.
  if (year < 1990 || date.getMonth() !== month - 1 || date.getDate() !== day || date > now) return null;
  return date.toISOString();
}

/** A photo moved to another day, keeping the time it was taken, never in the future. */
export function withDay(takenAt: string, day: string, now = new Date()): string {
  const date = new Date(takenAt);
  const target = parseDate(day);
  date.setFullYear(target.getFullYear(), target.getMonth(), target.getDate());
  return (date > now ? now : date).toISOString();
}

export type PhotoMonth = { key: string; title: string; photos: Photo[] };

/** Photos grouped by the month they were taken, in the order given (newest first). */
export function groupByMonth(photos: Photo[]): PhotoMonth[] {
  const months: PhotoMonth[] = [];
  for (const photo of photos) {
    const day = photoDay(photo);
    const key = day.slice(0, 7);
    const last = months.at(-1);
    if (last?.key === key) last.photos.push(photo);
    else months.push({ key, title: formatMonth(day), photos: [photo] });
  }
  return months;
}

/**
 * The oldest and the newest photos of the plant itself, to compare. Diagnosis
 * close-ups are left out. Null with fewer than two photos.
 */
export function beforeAfter(photos: Photo[]): { before: Photo; after: Photo } | null {
  const portraits = photos
    .filter((p) => !p.diagnosis_id)
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at) || a.created_at.localeCompare(b.created_at));
  if (portraits.length < 2) return null;
  return { before: portraits[0], after: portraits[portraits.length - 1] };
}

/** "8 mois plus tard", from one photo's day to a later one's. */
export function laterText(from: string, to: string): string {
  return daysBetween(from, to) === 0 ? 'le même jour' : `${formatElapsed(from, to)} plus tard`;
}

/** "4 mois après son arrivée": a photo's day, from the day the plant arrived. */
export function sinceArrivalText(acquiredOn: string, day: string): string {
  const days = daysBetween(acquiredOn, day);
  if (days === 0) return 'le jour de son arrivée';
  return `${formatElapsed(acquiredOn, day)} ${days > 0 ? 'après' : 'avant'} son arrivée`;
}
