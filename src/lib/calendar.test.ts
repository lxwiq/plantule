import { describe, expect, it } from '@jest/globals';

import type { Task } from '@/db/types';

import { addMonths, monthGrid, monthOf, projectTasks } from './calendar';
import { parseDate } from './dates';

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

/** Days with care, and the ids of the tasks planned on each. */
function plan(tasks: Task[], from: string, to: string, today: string) {
  return Object.fromEntries(
    [...projectTasks(tasks, from, to, today)].map(([day, list]) => [
      day,
      list.map((o) => (o.late ? `${o.task.id} (late)` : o.task.id)),
    ]),
  );
}

describe('the month grid', () => {
  it('starts weeks on Monday, with the neighbouring months’ days', () => {
    // September 2026 starts on a Tuesday.
    const weeks = monthGrid('2026-09-01');
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toEqual({ day: '2026-08-31', inMonth: false });
    expect(weeks[0][1]).toEqual({ day: '2026-09-01', inMonth: true });
    expect(weeks[4][2]).toEqual({ day: '2026-09-30', inMonth: true });
    expect(weeks[4][6]).toEqual({ day: '2026-10-04', inMonth: false });
    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(parseDate(week[0].day).getDay()).toBe(1);
    }
  });

  it('puts a month starting on Sunday at the end of the first week, over 6 weeks', () => {
    // 1 November 2026 is a Sunday.
    const weeks = monthGrid('2026-11-01');
    expect(weeks).toHaveLength(6);
    expect(weeks[0].map((d) => d.day)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
    expect(weeks[0].filter((d) => d.inMonth)).toHaveLength(1);
    expect(weeks[5][0]).toEqual({ day: '2026-11-30', inMonth: true });
    expect(weeks[5][6]).toEqual({ day: '2026-12-06', inMonth: false });
  });

  it('needs only 4 weeks for a February starting on Monday', () => {
    const weeks = monthGrid('2027-02-01');
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((d) => d.inMonth)).toBe(true);
  });

  it('moves between months across years', () => {
    expect(monthOf('2026-09-23')).toBe('2026-09-01');
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01');
    expect(addMonths('2026-09-01', 0)).toBe('2026-09-01');
  });
});

describe('care planned in the calendar', () => {
  const today = '2026-09-23';

  it('repeats each task every interval from its due date', () => {
    const tasks = [task({ id: 'water', next_due_on: '2026-09-25' })];
    expect(plan(tasks, '2026-08-31', '2026-10-04', today)).toEqual({
      '2026-09-25': ['water'],
      '2026-10-02': ['water'],
    });
  });

  it('lengthens the interval from November, counted from each occurrence', () => {
    const tasks = [task({ id: 'water', next_due_on: '2026-10-27', winter_factor: 1.5 })];
    // 27 October is not winter yet: 7 days. From 3 November on: 11 days.
    expect(plan(tasks, '2026-10-26', '2026-12-06', '2026-10-20')).toEqual({
      '2026-10-27': ['water'],
      '2026-11-03': ['water'],
      '2026-11-14': ['water'],
      '2026-11-25': ['water'],
      '2026-12-06': ['water'],
    });
  });

  it('shows overdue care today, flagged late, and plans the next one from today', () => {
    const tasks = [task({ id: 'water', next_due_on: '2026-09-20' })];
    const byDay = projectTasks(tasks, '2026-08-31', '2026-10-04', today);
    expect(byDay.has('2026-09-20')).toBe(false);
    expect(byDay.get('2026-09-23')?.map((o) => o.late)).toEqual([true]);
    expect(byDay.get('2026-09-30')?.map((o) => o.late)).toEqual([false]);
  });

  it('never plans anything before today', () => {
    const tasks = [task({ id: 'water', next_due_on: '2026-09-01', interval_days: 3 })];
    const days = [...projectTasks(tasks, '2026-08-31', '2026-10-04', today).keys()];
    expect(days.every((day) => day >= today)).toBe(true);
  });

  it('handles intervals longer than a month', () => {
    const tasks = [task({ id: 'repot', kind: 'repot', next_due_on: '2026-09-10', interval_days: 45 })];
    expect(plan(tasks, '2026-08-31', '2026-10-04', '2026-09-01')).toEqual({ '2026-09-10': ['repot'] });
    expect(plan(tasks, '2026-09-28', '2026-11-01', '2026-09-01')).toEqual({ '2026-10-25': ['repot'] });
  });

  it('keeps counting through the days before the range', () => {
    const tasks = [task({ id: 'water', next_due_on: '2026-09-25' })];
    expect(plan(tasks, '2026-10-01', '2026-10-10', today)).toEqual({
      '2026-10-02': ['water'],
      '2026-10-09': ['water'],
    });
  });

  it('sorts several tasks of the same day the same way, late ones first', () => {
    const tasks = [
      task({ id: 'b', next_due_on: '2026-09-23', created_at: '2026-09-02T08:00:00.000Z' }),
      task({ id: 'late', next_due_on: '2026-09-21', created_at: '2026-09-05T08:00:00.000Z' }),
      task({ id: 'a', next_due_on: '2026-09-23', created_at: '2026-09-01T08:00:00.000Z' }),
      task({ id: 'c', next_due_on: '2026-09-23', created_at: '2026-09-02T08:00:00.000Z' }),
    ];
    const expected = ['late (late)', 'a', 'b', 'c'];
    expect(plan(tasks, today, today, today)[today]).toEqual(expected);
    expect(plan([...tasks].reverse(), today, today, today)[today]).toEqual(expected);
  });
});
