import { describe, expect, it } from '@jest/globals';

import type { Plant, Task } from '@/db/types';

import { summaryFor } from './summary';
import { groupTasks } from './tasks';

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

describe('the Today screen groups', () => {
  const today = '2026-09-23';

  it('splits tasks into overdue, today, done today and this week, soonest first', () => {
    const doneToday = new Date(2026, 8, 23, 9, 0).toISOString();
    const groups = groupTasks(
      [
        task({ id: 'week', next_due_on: '2026-09-27' }),
        task({ id: 'late2', next_due_on: '2026-09-20' }),
        task({ id: 'today', next_due_on: '2026-09-23' }),
        task({ id: 'late1', next_due_on: '2026-09-21' }),
        task({ id: 'done', next_due_on: '2026-09-30', last_done_at: doneToday }),
        task({ id: 'later', next_due_on: '2026-10-15' }),
      ],
      today,
    );
    expect(groups.overdue.map((t) => t.id)).toEqual(['late2', 'late1']);
    expect(groups.dueToday.map((t) => t.id)).toEqual(['today']);
    expect(groups.doneToday.map((t) => t.id)).toEqual(['done']);
    expect(groups.upcoming.map((t) => t.id)).toEqual(['week']);
  });
});

describe('the daily summary', () => {
  const plants = [plant('p1', 'Ficus'), plant('p2', 'Monstre'), plant('p3', 'Pilea'), plant('p4', 'Cactus')];

  it('says nothing when nothing is due', () => {
    expect(summaryFor('2026-09-23', [task({ next_due_on: '2026-09-24' })], plants)).toBeNull();
  });

  it('counts plants to water, overdue included', () => {
    const summary = summaryFor(
      '2026-09-23',
      [task({ plant_id: 'p1', next_due_on: '2026-09-21' }), task({ plant_id: 'p2' })],
      plants,
    );
    expect(summary).toEqual({ title: '2 plantes à arroser', body: 'Ficus, Monstre' });
  });

  it('mentions other care and shortens long lists', () => {
    const summary = summaryFor(
      '2026-09-23',
      [
        task({ plant_id: 'p1' }),
        task({ plant_id: 'p2', kind: 'mist' }),
        task({ plant_id: 'p3', kind: 'fertilize' }),
        task({ plant_id: 'p4' }),
      ],
      plants,
    );
    expect(summary?.title).toBe('2 à arroser, 2 autres soins');
    expect(summary?.body).toBe('Ficus, Monstre, Pilea et 1 autre');
  });
});
