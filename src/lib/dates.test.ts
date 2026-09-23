import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  daysBetween,
  formatDue,
  formatInterval,
  formatLongDate,
  formatRelativeDay,
  formatRelativeTime,
  formatShortDate,
} from './dates';

describe('calendar dates', () => {
  it('adds days and counts days between dates', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(daysBetween('2026-09-20', '2026-09-23')).toBe(3);
    expect(daysBetween('2026-09-23', '2026-09-20')).toBe(-3);
  });

  it('ignores daylight saving changes', () => {
    // Clocks go back on 2026-10-25 in France.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('formats dates in French', () => {
    expect(formatLongDate('2026-09-23')).toBe('mercredi 23 septembre');
  });
});

describe('due dates', () => {
  const today = '2026-09-23';

  it('describes how soon a task is due', () => {
    expect(formatDue('2026-09-23', today)).toBe("aujourd'hui");
    expect(formatDue('2026-09-24', today)).toBe('demain');
    expect(formatDue('2026-09-26', today)).toBe('dans 3 jours');
    expect(formatDue('2026-09-22', today)).toBe('en retard d’1 jour');
    expect(formatDue('2026-09-20', today)).toBe('en retard de 3 jours');
  });

  it('describes intervals', () => {
    expect(formatInterval(1)).toBe('tous les jours');
    expect(formatInterval(7)).toBe('toutes les semaines');
    expect(formatInterval(14)).toBe('toutes les 2 semaines');
    expect(formatInterval(10)).toBe('tous les 10 jours');
  });

  it('writes long intervals in months or years when they are close to whole ones', () => {
    expect(formatInterval(30)).toBe('tous les mois');
    expect(formatInterval(90)).toBe('tous les 3 mois');
    expect(formatInterval(270)).toBe('tous les 9 mois');
    expect(formatInterval(365)).toBe('tous les ans');
    expect(formatInterval(730)).toBe('tous les 2 ans');
    expect(formatInterval(45)).toBe('tous les 45 jours');
  });

  it('writes the first of the month as "1er"', () => {
    expect(formatShortDate('2001-03-01')).toBe('1er mars 2001');
    expect(formatShortDate('2001-03-02')).toBe('2 mars 2001');
  });
});

describe('relative times', () => {
  const now = new Date(2026, 8, 23, 18, 0);

  it('describes recent moments', () => {
    expect(formatRelativeTime(new Date(2026, 8, 23, 17, 59, 40).toISOString(), now)).toBe("à l'instant");
    expect(formatRelativeTime(new Date(2026, 8, 23, 17, 45).toISOString(), now)).toBe('il y a 15 min');
    expect(formatRelativeTime(new Date(2026, 8, 23, 9, 5).toISOString(), now)).toBe("aujourd'hui à 9:05");
    expect(formatRelativeTime(new Date(2026, 8, 22, 9, 5).toISOString(), now)).toBe('hier à 9:05');
  });
});

describe('relative days', () => {
  it('describes a past day without the time', () => {
    const today = '2026-09-23';
    expect(formatRelativeDay('2026-09-23', today)).toBe("aujourd'hui");
    expect(formatRelativeDay('2026-09-22', today)).toBe('hier');
    expect(formatRelativeDay('2026-09-21', today)).toBe('avant-hier');
    expect(formatRelativeDay('2026-09-19', today)).toBe('il y a 4 jours');
    expect(formatRelativeDay('2026-09-10', today)).toBe('le 10 septembre');
  });
});
