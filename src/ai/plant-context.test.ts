import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getPlant, getRoom, getSpeciesSheet, listPlantEvents, listPlantTasks } from '@/db/repo';
import type { CareEvent, Plant, Room, SpeciesSheet, Task } from '@/db/types';
import type { CareSheet } from '@/lib/care-sheet';
import { getReference } from '@/lib/plant-reference';

import {
  buildPlantContext,
  contextText,
  EXPERT_SYSTEM,
  MAX_CONTEXT_LENGTH,
  type PlantContext,
} from './plant-context';

jest.mock('@/db/repo', () => ({
  getPlant: jest.fn(),
  getRoom: jest.fn(),
  getSpeciesSheet: jest.fn(),
  listPlantEvents: jest.fn(),
  listPlantTasks: jest.fn(),
}));

const TODAY = new Date(2026, 0, 15, 10);

const plant: Plant = {
  id: 'p1',
  place_id: 'home',
  room_id: 'r1',
  nickname: 'Monty',
  species: 'Monstera deliciosa',
  species_sheet_id: 's1',
  acquired_on: null,
  pot: 'Terre cuite, 20 cm',
  substrate: null,
  notes: 'Offerte par Mamie.',
  main_photo_id: null,
  main_photo_uri: null,
  created_at: '2025-06-01T10:00:00.000Z',
  updated_at: '2025-06-01T10:00:00.000Z',
};

const room: Room = {
  id: 'r1',
  place_id: 'home',
  name: 'Salon',
  light: 'bright_indirect',
  is_outdoor: false,
  created_at: '2025-06-01T10:00:00.000Z',
};

const sheetData: CareSheet = {
  common_name: 'Faux philodendron',
  scientific_name: 'Monstera deliciosa',
  light: 'bright_indirect',
  watering: { interval_days: 7, winter_factor: 1.5, advice: 'Laisse sécher le dessus du terreau.' },
  humidity: 'medium',
  temperature: { min_c: 15, max_c: 30 },
  toxicity: { cats: 'toxic', dogs: 'toxic' },
  fertilizing: { interval_days: 14 },
  misting: null,
  repotting: { interval_days: 730, advice: 'Au printemps.' },
  substrate: 'Terreau et écorce.',
  pot: 'Pot percé.',
  propagation: '',
  problems: [{ symptom: 'Feuilles jaunes', cause: 'Trop d’eau', fix: 'Espace les arrosages.' }],
  tips: ['Un tuteur.', 'Dépoussière.'],
  reference_id: 'monstera-deliciosa',
};

const sheet: SpeciesSheet = {
  id: 's1',
  scientific_name: 'Monstera deliciosa',
  common_name: 'Faux philodendron',
  data: sheetData,
  source: 'reference',
  created_at: '2025-06-01T10:00:00.000Z',
  updated_at: '2025-06-01T10:00:00.000Z',
};

const waterTask: Task = {
  id: 't1',
  plant_id: 'p1',
  kind: 'water',
  label: null,
  interval_days: 7,
  winter_factor: 1.5,
  last_done_at: null,
  next_due_on: '2026-01-13',
  wet_streak: 2,
  wet_days: 4,
  suggested_interval_days: 11,
  created_at: '2025-06-01T10:00:00.000Z',
  updated_at: '2025-06-01T10:00:00.000Z',
};

let eventCount = 0;
function event(kind: CareEvent['kind'], taskKind: CareEvent['task_kind'], daysAgo: number, postponed: number | null = null): CareEvent {
  const at = new Date(TODAY);
  at.setDate(at.getDate() - daysAgo);
  eventCount += 1;
  return {
    id: `e${eventCount}`,
    plant_id: 'p1',
    task_id: null,
    kind,
    task_kind: taskKind,
    task_label: null,
    occurred_at: at.toISOString(),
    postponed_days: postponed,
    note: null,
  };
}

beforeEach(() => {
  jest.useFakeTimers({ now: TODAY });
  jest.mocked(getPlant).mockReturnValue(plant);
  jest.mocked(getRoom).mockReturnValue(room);
  jest.mocked(getSpeciesSheet).mockReturnValue(sheet);
  jest.mocked(listPlantTasks).mockReturnValue([waterTask]);
  jest.mocked(listPlantEvents).mockReturnValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the expert', () => {
  it('is a careful gardener who says "tu" and sends to the vet', () => {
    expect(EXPERT_SYSTEM).toContain('jardinier prudent');
    expect(EXPERT_SYSTEM).toContain('en tutoyant');
    expect(EXPERT_SYSTEM).toContain('tu le dis au lieu d’inventer');
    expect(EXPERT_SYSTEM).toContain('vétérinaire');
    // The chat shares it: the JSON instruction is added by the JSON tasks only.
    expect(EXPERT_SYSTEM).not.toContain('JSON');
  });
});

describe('reading what the app knows of a plant', () => {
  it('gives null for a plant that does not exist', () => {
    jest.mocked(getPlant).mockReturnValue(null);
    expect(buildPlantContext('gone')).toBeNull();
  });

  it('reads the plant, its sheet, reference, room and watering task', () => {
    const context = buildPlantContext('p1');
    expect(context).toMatchObject({
      nickname: 'Monty',
      species: 'Monstera deliciosa',
      sheet: sheetData,
      reference: getReference('monstera-deliciosa'),
      room: { name: 'Salon', light: 'bright_indirect', isOutdoor: false },
      today: '2026-01-15',
      month: 1,
      watering: { intervalDays: 7, winterFactor: 1.5, wetStreak: 2, nextDueOn: '2026-01-13' },
      pot: 'Terre cuite, 20 cm',
      substrate: null,
      notes: 'Offerte par Mamie.',
    });
    expect(getSpeciesSheet).toHaveBeenCalledWith('s1');
    expect(getRoom).toHaveBeenCalledWith('r1');
  });

  it('finds the reference from the species when the sheet has none', () => {
    jest.mocked(getSpeciesSheet).mockReturnValue(null);
    jest.mocked(getPlant).mockReturnValue({ ...plant, species: 'Pothos', species_sheet_id: null, room_id: null });
    const context = buildPlantContext('p1');
    expect(context?.reference?.id).toBe('epipremnum-aureum');
    expect(context?.sheet).toBeNull();
    expect(context?.room).toBeNull();
  });

  it('keeps 8 recent care entries, watering first', () => {
    const misting = Array.from({ length: 10 }, (_, i) => event('done', 'mist', i));
    const watering = Array.from({ length: 6 }, (_, i) => event(i === 1 ? 'soil_wet' : 'done', 'water', 11 + i * 3, i === 1 ? 2 : null));
    const all = [...misting, ...watering].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    jest.mocked(listPlantEvents).mockReturnValue(all);

    const events = buildPlantContext('p1')!.recentEvents;
    expect(events).toHaveLength(8);
    expect(events.filter((e) => e.taskKind === 'water')).toHaveLength(5);
    expect(events.map((e) => e.day)).toEqual([...events.map((e) => e.day)].sort().reverse());
    expect(events[0]).toEqual({ kind: 'done', taskKind: 'mist', day: '2026-01-15', postponedDays: null });
    expect(events).toContainEqual({ kind: 'soil_wet', taskKind: 'water', day: '2026-01-01', postponedDays: 2 });
  });
});

describe('the context given to the model', () => {
  const context: PlantContext = {
    nickname: 'Monty',
    species: 'Monstera deliciosa',
    sheet: sheetData,
    reference: getReference('monstera-deliciosa'),
    room: { name: 'Salon', light: 'bright_indirect', isOutdoor: false },
    today: '2026-01-15',
    month: 1,
    recentEvents: [
      { kind: 'soil_wet', taskKind: 'water', day: '2026-01-14', postponedDays: 2 },
      { kind: 'done', taskKind: 'fertilize', day: '2026-01-10', postponedDays: null },
      { kind: 'done', taskKind: 'water', day: '2026-01-05', postponedDays: null },
    ],
    watering: { intervalDays: 7, winterFactor: 1.5, wetStreak: 2, nextDueOn: '2026-01-13' },
    pot: 'Terre cuite, 20 cm',
    substrate: null,
    notes: 'Offerte par Mamie.',
  };

  it('tells the species, its verified figures, the room, the season and the recent care', () => {
    expect(contextText(context)).toBe(
      [
        'Plante : « Monty », Faux philodendron (Monstera deliciosa).',
        'Données vérifiées de l’espèce, en pot :',
        '- lumière : lumineux, sans soleil direct',
        '- arrosage : tous les 7 jours au printemps et en été, 1,5 fois plus espacé de novembre à février',
        '- humidité de l’air : moyenne',
        '- températures supportées : de 15 à 30 °C',
        '- toxicité : toxique pour les chats et les chiens',
        '- engrais : tous les 14 jours au printemps et en été',
        '- brumisation : pas nécessaire',
        '- rempotage : tous les 2 ans',
        'Problèmes fréquents de l’espèce : feuilles jaunes (trop d’eau).',
        'Pièce : Salon, à l’intérieur, lumineux, sans soleil direct.',
        'Pot : Terre cuite, 20 cm.',
        'Mois : janvier (hiver, repos : arrosages espacés, pas d’engrais).',
        'Rappel d’arrosage : tous les 7 jours (×1,5 en hiver) ; en retard de 2 j.',
        'Terreau encore humide 2 fois de suite depuis le dernier arrosage.',
        'Derniers soins, du plus récent au plus ancien :',
        '- hier : arrosage reporté de 2 j, terreau encore humide',
        '- il y a 5 j : engrais fait',
        '- il y a 10 j : arrosage fait',
        'Notes : Offerte par Mamie.',
      ].join('\n'),
    );
  });

  it('uses the sheet’s figures without a reference, and says what it does not know', () => {
    const text = contextText({
      ...context,
      sheet: { ...sheetData, reference_id: null, misting: { interval_days: 4 } },
      reference: null,
      room: { name: 'Balcon', light: null, isOutdoor: true },
      month: 7,
      recentEvents: [],
      watering: null,
      pot: null,
      notes: '  ',
    });
    expect(text).toContain('Fiche de l’espèce :\n- lumière');
    expect(text).toContain('- brumisation : tous les 4 jours');
    expect(text).not.toContain('Données vérifiées');
    expect(text).toContain('Pièce : Balcon, dehors.');
    expect(text).toContain('Mois : juillet (été : pleine pousse).');
    expect(text).toContain('Pas de rappel d’arrosage dans l’app.');
    expect(text).toContain('Aucun soin noté dans l’app pour l’instant.');
    expect(text).not.toContain('Pot :');
    expect(text).not.toContain('Notes :');

    const unknown = contextText({ ...context, sheet: null, reference: null, species: null, room: null });
    expect(unknown).toContain('Plante : « Monty », espèce inconnue.');
    expect(unknown).toContain('Pièce : pas indiquée.');
  });

  it('stays within about 600 tokens whatever the plant holds', () => {
    const long = 'Très long texte qui ne s’arrête pas '.repeat(100);
    const text = contextText({
      ...context,
      nickname: long,
      species: long,
      sheet: {
        ...sheetData,
        common_name: 'Faux philodendron à très grandes feuilles découpées',
        problems: Array.from({ length: 3 }, () => ({ symptom: long, cause: long, fix: long })),
      },
      room: { name: long, light: 'partial_shade', isOutdoor: false },
      recentEvents: Array.from({ length: 12 }, (_, i) => ({
        kind: 'soil_wet' as const,
        taskKind: 'clean' as const,
        day: `2026-01-0${(i % 9) + 1}`,
        postponedDays: 14,
      })),
      pot: long,
      substrate: long,
      notes: long,
    });
    // About 3.5 characters per token in French.
    expect(MAX_CONTEXT_LENGTH).toBeLessThanOrEqual(600 * 3.5);
    expect(text.length).toBeLessThanOrEqual(MAX_CONTEXT_LENGTH);
    // The oldest entries gave way; the most recent ones and the notes stay.
    const events = text.split('\n').filter((line) => line.startsWith('- il y a'));
    expect(events.length).toBeGreaterThanOrEqual(6);
    expect(events[0]).toMatch(/^- il y a 14 j/);
    expect(text).toMatch(/Notes : .{150,200}$/);
  });
});
