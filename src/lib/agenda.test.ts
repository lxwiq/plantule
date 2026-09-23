import { describe, expect, it } from '@jest/globals';

import type { Plant, Task } from '@/db/types';

import { agendaChanges, agendaEvents, allDayRange, eventDay, type StoredEvent } from './agenda';

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? Math.random().toString(36),
    plant_id: 'p1',
    kind: 'water',
    label: null,
    interval_days: 7,
    winter_factor: 1,
    last_done_at: null,
    next_due_on: '2026-09-23',
    wet_streak: 0,
    wet_days: 0,
    suggested_interval_days: null,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

function plant(id: string, nickname: string): Plant {
  return {
    id,
    place_id: 'home',
    room_id: null,
    nickname,
    species: null,
    species_sheet_id: null,
    acquired_on: null,
    pot: null,
    substrate: null,
    notes: null,
    main_photo_id: null,
    main_photo_uri: null,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-01T08:00:00.000Z',
  };
}

const today = '2026-09-23';
const plants = [plant('p1', 'Ficus'), plant('p2', 'Monstera'), plant('p3', 'Pilea')];

describe('the care written to the phone’s calendar', () => {
  it('writes one event per day with care, projected like the month calendar', () => {
    const events = agendaEvents(
      [
        task({ plant_id: 'p1', next_due_on: '2026-09-21' }),
        task({ plant_id: 'p2', next_due_on: '2026-09-25', interval_days: 14 }),
        task({ plant_id: 'p3', kind: 'fertilize', next_due_on: '2026-09-23', interval_days: 30 }),
      ],
      plants,
      today,
      14,
    );
    expect(events).toEqual([
      {
        day: '2026-09-23',
        title: '1 à arroser, 1 autre soin',
        notes: 'Arroser : Ficus (en retard)\nMettre de l’engrais : Pilea',
      },
      { day: '2026-09-25', title: '1 plante à arroser', notes: 'Arroser : Monstera' },
      { day: '2026-09-30', title: '1 plante à arroser', notes: 'Arroser : Ficus' },
    ]);
  });

  it('groups the plants getting the same care on a day', () => {
    const [event] = agendaEvents(
      [
        task({ plant_id: 'p3', kind: 'mist' }),
        task({ plant_id: 'p1' }),
        task({ plant_id: 'p2', next_due_on: '2026-09-20' }),
      ],
      plants,
      today,
      1,
    );
    expect(event).toEqual({
      day: today,
      title: '2 à arroser, 1 autre soin',
      notes: 'Arroser : Monstera (en retard), Ficus\nBrumiser : Pilea',
    });
  });

  it('lists the plants late first, then by name, so that the days that did not change stay the same', () => {
    const before = agendaEvents(
      [task({ plant_id: 'p2', next_due_on: '2026-09-22' }), task({ plant_id: 'p1' })],
      plants,
      today,
      14,
    );
    // Monstera watered today comes back in a week, with Ficus.
    const after = agendaEvents(
      [task({ plant_id: 'p2', next_due_on: '2026-09-30' }), task({ plant_id: 'p1' })],
      plants,
      today,
      14,
    );
    expect(before.map((e) => e.notes)).toEqual(['Arroser : Monstera (en retard), Ficus', 'Arroser : Ficus, Monstera']);
    expect(after.map((e) => e.notes)).toEqual(['Arroser : Ficus', 'Arroser : Ficus, Monstera']);
    expect(agendaChanges(before.map((e, i) => ({ ...e, id: String(i) })), after, today)).toEqual({
      remove: ['0'],
      add: [after[0]],
    });
  });

  it('lengthens the intervals in winter, like the month calendar', () => {
    const days = agendaEvents(
      [task({ next_due_on: '2026-10-27', winter_factor: 1.5 })],
      plants,
      '2026-10-20',
      30,
    ).map((e) => e.day);
    expect(days).toEqual(['2026-10-27', '2026-11-03', '2026-11-14']);
  });

  it('stays within the window and skips plants from another place', () => {
    const events = agendaEvents(
      [task({ next_due_on: '2026-10-23' }), task({ plant_id: 'elsewhere' })],
      plants,
      today,
      30,
    );
    expect(events).toEqual([]);
  });
});

describe('updating the phone’s calendar', () => {
  const wanted = [
    { day: '2026-09-23', title: '1 plante à arroser', notes: 'Arroser : Ficus' },
    { day: '2026-09-25', title: '1 plante à arroser', notes: 'Arroser : Monstera' },
  ];
  const stored = (id: string, day: string, title = '1 plante à arroser', notes = 'Arroser : Ficus'): StoredEvent => ({
    id,
    day,
    title,
    notes,
  });

  it('writes everything into an empty calendar', () => {
    expect(agendaChanges([], wanted, today)).toEqual({ remove: [], add: wanted });
  });

  it('changes nothing when the calendar is up to date', () => {
    const current = [stored('a', '2026-09-23'), stored('b', '2026-09-25', undefined, 'Arroser : Monstera')];
    expect(agendaChanges(current, wanted, today)).toEqual({ remove: [], add: [] });
  });

  it('rewrites the days that changed and removes the days without care', () => {
    const current = [
      stored('a', '2026-09-23'),
      stored('b', '2026-09-25', '1 plante à arroser', 'Arroser : Ficus'),
      stored('c', '2026-09-28'),
    ];
    expect(agendaChanges(current, wanted, today)).toEqual({ remove: ['b', 'c'], add: [wanted[1]] });
  });

  it('keeps the past days and removes duplicates', () => {
    const current = [stored('old', '2026-09-20'), stored('a', '2026-09-23'), stored('twin', '2026-09-23')];
    expect(agendaChanges(current, wanted.slice(0, 1), today)).toEqual({ remove: ['twin'], add: [] });
  });
});

describe('all-day events', () => {
  it('run from midnight to midnight UTC', () => {
    const { startDate, endDate } = allDayRange('2026-12-31');
    expect(startDate.toISOString()).toBe('2026-12-31T00:00:00.000Z');
    expect(endDate.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('are read back on their day, whether the calendar gives UTC or local times', () => {
    expect(eventDay('2026-09-23T00:00:00.000Z', '2026-09-24T00:00:00.000Z')).toBe('2026-09-23');
    // Midnight in Paris (UTC+2) and in Tahiti (UTC-10).
    expect(eventDay('2026-09-22T22:00:00.000Z', '2026-09-23T22:00:00.000Z')).toBe('2026-09-23');
    expect(eventDay('2026-09-23T10:00:00.000Z', '2026-09-24T10:00:00.000Z')).toBe('2026-09-23');
  });
});
