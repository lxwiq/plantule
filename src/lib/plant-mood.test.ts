import { describe, expect, it } from '@jest/globals';

import type { Task } from '@/db/types';

import { addDays, parseDate } from './dates';
import { plantMood, WORRIED_DAYS, type LatestDiagnosis } from './plant-mood';

const DAY = '2026-09-23';

/** Noon on a local day, as the ISO instant the database keeps. */
const at = (day: string) => new Date(parseDate(day).getTime() + 12 * 3_600_000).toISOString();

function task(overrides: Partial<Task>): Task {
  return {
    id: Math.random().toString(36),
    plant_id: 'p1',
    kind: 'water',
    label: null,
    interval_days: 7,
    winter_factor: 1,
    last_done_at: null,
    next_due_on: addDays(DAY, 3),
    wet_streak: 0,
    wet_days: 0,
    suggested_interval_days: null,
    created_at: at('2026-09-01'),
    updated_at: at('2026-09-01'),
    ...overrides,
  };
}

const diagnosis = (status: LatestDiagnosis['status'], day: string): LatestDiagnosis => ({
  status,
  created_at: at(day),
});

describe('plantMood', () => {
  it('is happy by default, with or without tasks', () => {
    expect(plantMood([], null, DAY)).toBe('happy');
    expect(plantMood([task({})], undefined, DAY)).toBe('happy');
  });

  it('is thirsty when a watering is overdue, not when it is due today', () => {
    expect(plantMood([task({ next_due_on: addDays(DAY, -1) })], null, DAY)).toBe('thirsty');
    expect(plantMood([task({ next_due_on: DAY })], null, DAY)).toBe('happy');
    // Other late care does not make it thirsty.
    expect(plantMood([task({ kind: 'fertilize', next_due_on: addDays(DAY, -5) })], null, DAY)).toBe('happy');
  });

  it('is worried while its latest diagnosis says to treat it', () => {
    expect(plantMood([], diagnosis('treat', addDays(DAY, -2)), DAY)).toBe('worried');
    expect(plantMood([], diagnosis('watch', addDays(DAY, -2)), DAY)).toBe('happy');
    expect(plantMood([], diagnosis('treat', addDays(DAY, -WORRIED_DAYS + 1)), DAY)).toBe('worried');
    expect(plantMood([], diagnosis('treat', addDays(DAY, -WORRIED_DAYS)), DAY)).toBe('happy');
  });

  it('is joyful when some care was done today', () => {
    const watered = task({ last_done_at: at(DAY), next_due_on: addDays(DAY, 7) });
    expect(plantMood([watered], null, DAY)).toBe('joy');
    const yesterday = task({ last_done_at: at(addDays(DAY, -1)), next_due_on: addDays(DAY, 6) });
    expect(plantMood([yesterday], null, DAY)).toBe('happy');
  });

  it('puts thirst first, then worry, then joy', () => {
    const late = task({ next_due_on: addDays(DAY, -2) });
    const misted = task({ kind: 'mist', last_done_at: at(DAY), next_due_on: addDays(DAY, 4) });
    const treat = diagnosis('treat', DAY);
    expect(plantMood([late, misted], treat, DAY)).toBe('thirsty');
    expect(plantMood([misted], treat, DAY)).toBe('worried');
    expect(plantMood([misted], diagnosis('healthy', DAY), DAY)).toBe('joy');
  });
});
