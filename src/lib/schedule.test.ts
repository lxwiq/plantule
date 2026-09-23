import { describe, expect, it } from '@jest/globals';

import {
  effectiveInterval,
  firstDueOn,
  isWinter,
  nextDueAfterDone,
  postpone,
  suggestedInterval,
} from './schedule';

describe('rolling recurrence', () => {
  it('counts the next due date from the day it was done', () => {
    // Due on the 10th, watered two days late on the 12th: next is the 19th.
    expect(nextDueAfterDone('2026-06-12', 7, 1.5)).toBe('2026-06-19');
  });

  it('crosses month and year boundaries', () => {
    expect(nextDueAfterDone('2026-06-28', 7, 1)).toBe('2026-07-05');
    expect(nextDueAfterDone('2026-10-30', 7, 1)).toBe('2026-11-06');
  });
});

describe('winter adjustment', () => {
  it('covers November to February', () => {
    expect(isWinter('2026-11-01')).toBe(true);
    expect(isWinter('2027-02-28')).toBe(true);
    expect(isWinter('2027-03-01')).toBe(false);
    expect(isWinter('2026-10-31')).toBe(false);
  });

  it('multiplies the interval in winter', () => {
    expect(nextDueAfterDone('2026-12-01', 7, 1.5)).toBe('2026-12-12');
    expect(effectiveInterval(7, 1, '2027-01-15')).toBe(7);
  });

  it('never drops below one day', () => {
    expect(effectiveInterval(1, 0.5, '2027-01-15')).toBe(1);
  });
});

describe('postponing', () => {
  it('counts from today when the task is overdue', () => {
    expect(postpone('2026-06-01', '2026-06-05', 2)).toBe('2026-06-07');
  });

  it('counts from the due date when it is still ahead', () => {
    expect(postpone('2026-06-10', '2026-06-05', 1)).toBe('2026-06-11');
  });
});

describe('soil still wet', () => {
  it('suggests a longer interval after two postponements in a row', () => {
    expect(suggestedInterval(7, 1, 2)).toBeNull();
    expect(suggestedInterval(7, 2, 4)).toBe(11);
  });

  it('caps the suggestion', () => {
    expect(suggestedInterval(700, 3, 60)).toBe(730);
  });
});

describe('first due date of a new task', () => {
  it('is today when the last time is unknown', () => {
    expect(firstDueOn(null, 7, 1.5, '2026-09-23')).toBe('2026-09-23');
  });

  it('counts one interval from the last time', () => {
    // Watered two days ago, every 7 days: due in 5 days.
    expect(firstDueOn('2026-09-21', 7, 1.5, '2026-09-23')).toBe('2026-09-28');
    expect(firstDueOn('2026-09-23', 7, 1.5, '2026-09-23')).toBe('2026-09-30');
  });

  it('is never overdue', () => {
    expect(firstDueOn('2026-09-01', 7, 1.5, '2026-09-23')).toBe('2026-09-23');
  });

  it('applies the winter factor', () => {
    expect(firstDueOn('2026-12-01', 7, 1.5, '2026-12-02')).toBe('2026-12-12');
  });
});
