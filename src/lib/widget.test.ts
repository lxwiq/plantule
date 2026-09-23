import { describe, expect, it } from '@jest/globals';

import type { Plant, Task } from '@/db/types';

import { widgetContent } from './widget';

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
const plants = [
  plant('p1', 'Ficus'),
  plant('p2', 'Monstera'),
  plant('p3', 'Pilea'),
  plant('p4', 'Cactus'),
  plant('p5', 'Pothos'),
];

describe('the home-screen widget', () => {
  it('lists the plants to water today and the overdue ones, with the summary’s title', () => {
    const content = widgetContent(
      [
        task({ plant_id: 'p1' }),
        task({ plant_id: 'p2', next_due_on: '2026-09-21' }),
        task({ plant_id: 'p3', next_due_on: '2026-09-24' }),
      ],
      plants,
      today,
      4,
    );
    expect(content.title).toBe('2 plantes à arroser');
    expect(content.rows.map((r) => [r.name, r.care, r.late])).toEqual([
      ['Monstera', 'Arroser', true],
      ['Ficus', 'Arroser', false],
    ]);
    expect(content.late).toBe(1);
    expect(content.more).toBeNull();
    expect(content.message).toBeNull();
  });

  it('puts the plants to water first, then the other care', () => {
    const content = widgetContent(
      [
        task({ plant_id: 'p3', kind: 'fertilize', next_due_on: '2026-09-20' }),
        task({ plant_id: 'p1' }),
        task({ plant_id: 'p1', kind: 'mist', next_due_on: '2026-09-22' }),
        task({ plant_id: 'p2', kind: 'repot', label: 'Changer de pot' }),
      ],
      plants,
      today,
      4,
    );
    expect(content.title).toBe('1 à arroser, 3 autres soins');
    expect(content.rows.map((r) => [r.name, r.care, r.kind])).toEqual([
      ['Ficus', 'Arroser · Brumiser', 'water'],
      ['Pilea', 'Mettre de l’engrais', 'fertilize'],
      ['Monstera', 'Changer de pot', 'repot'],
    ]);
  });

  it('keeps the care short, so that the name fits', () => {
    const content = widgetContent(
      [
        task({ plant_id: 'p1', kind: 'water' }),
        task({ plant_id: 'p1', kind: 'fertilize' }),
        task({ plant_id: 'p2', kind: 'other', label: 'Surveiller les cochenilles sous les feuilles' }),
      ],
      plants,
      today,
      4,
    );
    expect(content.rows.map((r) => r.care)).toEqual(['2 soins', 'Surveiller les cochenil…']);
  });

  it('keeps the last line for the plants that do not fit', () => {
    const tasks = plants.map((p) => task({ plant_id: p.id }));
    const content = widgetContent(tasks, plants, today, 3);
    expect(content.rows.map((r) => r.name)).toEqual(['Ficus', 'Monstera']);
    expect(content.more).toBe('+3 autres');
    expect(widgetContent(tasks, plants, today, 4).more).toBe('+2 autres');
    expect(widgetContent(tasks, plants, today, 5).more).toBeNull();
    expect(widgetContent(tasks.slice(0, 3), plants, today, 2).more).toBe('+2 autres');
    expect(widgetContent(tasks.slice(0, 2), plants, today, 1).more).toBe('+2 autres');
  });

  it('shows only the title when there is no room for rows', () => {
    const content = widgetContent([task({ plant_id: 'p1' }), task({ plant_id: 'p2' })], plants, today, 0);
    expect(content.title).toBe('2 plantes à arroser');
    expect(content.rows).toEqual([]);
    expect(content.more).toBeNull();
  });

  it('is calm when there is nothing to do', () => {
    const content = widgetContent([task({ next_due_on: '2026-09-24' })], plants, today, 4);
    expect(content).toEqual({
      title: 'Rien à faire aujourd’hui',
      rows: [],
      more: null,
      message: 'Toutes les plantes sont à jour.',
      late: 0,
    });
    expect(widgetContent([], [], today, 4).message).toBe('Ajoute tes plantes dans Plantule.');
  });

  it('ignores tasks of plants from another place', () => {
    const content = widgetContent([task({ plant_id: 'elsewhere' })], plants, today, 4);
    expect(content.rows).toEqual([]);
    expect(content.title).toBe('Rien à faire aujourd’hui');
  });
});
