import { describe, expect, it } from '@jest/globals';

import type { Task } from '@/db/types';

import { careToday, greeting, partOfDay, wardrobeTitle, type CareToday } from './greeting';

const DAY = '2026-09-23';

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? Math.random().toString(36),
    plant_id: 'p1',
    kind: 'water',
    label: null,
    interval_days: 7,
    winter_factor: 1,
    last_done_at: null,
    next_due_on: DAY,
    wet_streak: 0,
    wet_days: 0,
    suggested_interval_days: null,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

const NOTHING: CareToday = { thirsty: 0, late: 0, due: 0, done: 0 };
const say = (hour: number, care: Partial<CareToday>, plantCount = 3, day = DAY) =>
  greeting({ hour, day, name: 'Pépin', plantCount, care: { ...NOTHING, ...care } });

describe('wardrobeTitle', () => {
  it('elides « de » before a vowel', () => {
    expect(wardrobeTitle('Pépin')).toBe('Le vestiaire de Pépin');
    expect(wardrobeTitle('Olive')).toBe('Le vestiaire d’Olive');
    expect(wardrobeTitle('Émile')).toBe('Le vestiaire d’Émile');
  });
});

describe('partOfDay', () => {
  it('splits the day in four', () => {
    expect([4, 5, 11, 12, 17, 18, 21, 22, 0].map(partOfDay)).toEqual([
      'night',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
      'evening',
      'night',
      'night',
    ]);
  });
});

describe('careToday', () => {
  it('counts each plant once, in its most pressing group', () => {
    const tasks = [
      task({ plant_id: 'a', kind: 'water', next_due_on: '2026-09-20' }),
      task({ plant_id: 'a', kind: 'fertilize', next_due_on: '2026-09-21' }),
      task({ plant_id: 'b', kind: 'mist', next_due_on: '2026-09-22' }),
      task({ plant_id: 'b', kind: 'water', next_due_on: DAY }),
      task({ plant_id: 'c', kind: 'water', next_due_on: DAY }),
      task({ plant_id: 'd', kind: 'water', next_due_on: '2026-09-30', last_done_at: new Date(2026, 8, 23, 9).toISOString() }),
    ];
    expect(careToday(tasks, DAY)).toEqual({ thirsty: 1, late: 1, due: 1, done: 1 });
  });
});

describe('greeting', () => {
  it('says hello for the time of day', () => {
    expect(['Bonjour !', 'Coucou, bien dormi ?', 'Bonjour, belle journée à toi !']).toContain(say(8, {}).hello);
    expect(['Bonsoir !', 'Douce soirée !', 'Coucou, ça va ce soir ?']).toContain(say(19, {}).hello);
  });

  it('introduces itself when there is no plant yet', () => {
    const days = ['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];
    const messages = days.map((day) => say(9, {}, 0, day));
    expect(messages.every((g) => g.mood === 'happy')).toBe(true);
    expect(messages.some((g) => g.message.includes('Pépin'))).toBe(true);
  });

  it('worries about thirsty plants first, with the right count', () => {
    const many = say(10, { thirsty: 2, late: 1, due: 3 });
    expect(many.mood).toBe('thirsty');
    expect(many.message).toMatch(/^2 plantes/);
    expect(say(10, { thirsty: 1 }).message).toMatch(/^Une plante/);
    expect(say(10, { late: 2 }).mood).toBe('worried');
  });

  it('cheers what is due today, and what is done', () => {
    expect(say(10, { due: 4 }).message).toContain('4 plantes');
    expect(say(20, { due: 1 }).message).toBe('Il reste une plante à chouchouter ce soir.');
    expect(say(15, { done: 2 }).mood).toBe('joy');
    expect(say(21, { done: 2 }).mood).toBe('sleepy');
  });

  it('keeps the same words all day long', () => {
    const morning = say(9, { due: 2 });
    expect(say(11, { due: 2 })).toEqual(morning);
    const week = ['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
    const wordings = new Set(week.map((day) => say(9, { due: 2 }, 3, day).message));
    expect(wordings.size).toBeGreaterThan(1);
  });
});
