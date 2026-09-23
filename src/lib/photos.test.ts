import { describe, expect, it } from '@jest/globals';

import type { Photo } from '@/db/types';

import { beforeAfter, exifTakenAt, groupByMonth, laterText, photoDay, sinceArrivalText, withDay } from './photos';

/** A local time as an instant; months count from 0 like Date. */
const at = (year: number, month: number, day: number, hours = 12, minutes = 0) =>
  new Date(year, month, day, hours, minutes).toISOString();

function photo(id: string, takenAt: string, diagnosisId: string | null = null): Photo {
  return {
    id,
    plant_id: 'p1',
    uri: `file:///photos/${id}.jpg`,
    taken_at: takenAt,
    diagnosis_id: diagnosisId,
    created_at: takenAt,
  };
}

describe('when a photo was taken', () => {
  const now = new Date(2026, 8, 23, 12, 0);

  it('reads the EXIF date as local time', () => {
    expect(exifTakenAt({ DateTimeOriginal: '2026:03:14 10:22:05' }, now)).toBe(
      new Date(2026, 2, 14, 10, 22, 5).toISOString(),
    );
  });

  it('ignores missing, unset or future dates', () => {
    expect(exifTakenAt(undefined, now)).toBeNull();
    expect(exifTakenAt({}, now)).toBeNull();
    expect(exifTakenAt({ DateTimeOriginal: 42 }, now)).toBeNull();
    expect(exifTakenAt({ DateTimeOriginal: '0000:00:00 00:00:00' }, now)).toBeNull();
    expect(exifTakenAt({ DateTimeOriginal: '2026:13:40 10:00:00' }, now)).toBeNull();
    expect(exifTakenAt({ DateTimeOriginal: '2027:01:01 10:00:00' }, now)).toBeNull();
  });

  it('gives the local day, not the UTC one', () => {
    expect(photoDay(photo('a', at(2026, 8, 1, 0, 30)))).toBe('2026-09-01');
  });

  it('moves a photo to another day at the same time, never in the future', () => {
    expect(withDay(at(2026, 2, 14, 10, 22), '2026-01-02', now)).toBe(at(2026, 0, 2, 10, 22));
    expect(withDay(at(2026, 2, 14, 18, 0), '2026-09-23', now)).toBe(now.toISOString());
  });
});

describe('the growth gallery', () => {
  it('groups photos by month, newest first', () => {
    const photos = [
      photo('c', at(2026, 8, 20)),
      photo('b', at(2026, 8, 2)),
      photo('a', at(2026, 7, 30)),
      photo('old', at(2025, 8, 1)),
    ];
    expect(groupByMonth(photos).map((m) => [m.title, m.photos.map((p) => p.id)])).toEqual([
      ['septembre 2026', ['c', 'b']],
      ['août 2026', ['a']],
      ['septembre 2025', ['old']],
    ]);
  });

  it('compares the oldest and newest photos, without diagnosis close-ups', () => {
    const photos = [
      photo('leaf', at(2026, 8, 20), 'd1'),
      photo('new', at(2026, 7, 1)),
      photo('middle', at(2026, 3, 1)),
      photo('first-leaf', at(2025, 0, 1), 'd0'),
      photo('old', at(2026, 0, 14)),
    ];
    const pair = beforeAfter(photos);
    expect(pair?.before.id).toBe('old');
    expect(pair?.after.id).toBe('new');
  });

  it('needs two photos of the plant itself to compare', () => {
    expect(beforeAfter([photo('a', at(2026, 0, 1)), photo('b', at(2026, 1, 1), 'd1')])).toBeNull();
  });

  it('says how much time passed between two photos', () => {
    expect(laterText('2026-01-14', '2026-09-23')).toBe('8 mois plus tard');
    expect(laterText('2026-09-23', '2026-09-23')).toBe('le même jour');
    expect(laterText('2026-09-22', '2026-09-23')).toBe('1 jour plus tard');
    expect(laterText('2026-09-20', '2026-09-23')).toBe('3 jours plus tard');
    expect(laterText('2026-09-01', '2026-09-15')).toBe('2 semaines plus tard');
    // A whole month only once the same day of the month is reached.
    expect(laterText('2026-01-31', '2026-02-28')).toBe('4 semaines plus tard');
    expect(laterText('2025-06-01', '2026-09-23')).toBe('1 an et 3 mois plus tard');
    expect(laterText('2024-09-23', '2026-09-23')).toBe('2 ans plus tard');
  });

  it('dates a photo from the plant’s arrival', () => {
    expect(sinceArrivalText('2026-05-10', '2026-09-23')).toBe('4 mois après son arrivée');
    expect(sinceArrivalText('2026-05-10', '2026-04-01')).toBe('1 mois avant son arrivée');
    expect(sinceArrivalText('2026-05-10', '2026-05-10')).toBe('le jour de son arrivée');
  });
});
