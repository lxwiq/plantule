import { describe, expect, it } from '@jest/globals';

import {
  careSheetTasks,
  formatCareInterval,
  toxicityText,
  validateCareSheet,
  type CareSheet,
} from './care-sheet';
import { confidenceText, validateIdentification } from './identification';

const monstera: CareSheet = {
  common_name: 'Faux philodendron',
  scientific_name: 'Monstera deliciosa',
  light: 'bright_indirect',
  watering: { interval_days: 7, winter_factor: 1.5, advice: 'Laisse sécher le dessus du terreau.' },
  humidity: 'medium',
  temperature: { min_c: 15, max_c: 30 },
  toxicity: { cats: 'toxic', dogs: 'toxic' },
  fertilizing: { interval_days: 14 },
  misting: { interval_days: 4 },
  repotting: { interval_days: 730 },
  tips: ['Donne-lui un tuteur.', 'Dépoussière les feuilles.'],
};

function errorsOf(value: unknown): string[] {
  const result = validateCareSheet(value);
  return result.ok ? [] : result.errors;
}

describe('care sheet validation', () => {
  it('accepts a complete sheet as is', () => {
    expect(validateCareSheet(JSON.parse(JSON.stringify(monstera)))).toEqual({ ok: true, value: monstera });
  });

  it('forgives the slips of a small model', () => {
    const result = validateCareSheet({
      ...monstera,
      scientific_name: '  Monstera   deliciosa ',
      light: 'Bright indirect',
      humidity: 'moyenne',
      watering: { interval_days: '7 jours', winter_factor: '1,5', advice: 'Peu.' },
      toxicity: { cats: 'oui', dogs: 'non' },
      temperature: { min_c: 15.4, max_c: 30 },
      misting: undefined,
      tips: ['Un', '', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scientific_name).toBe('Monstera deliciosa');
    expect(result.value.light).toBe('bright_indirect');
    expect(result.value.humidity).toBe('medium');
    expect(result.value.watering).toEqual({ interval_days: 7, winter_factor: 1.5, advice: 'Peu.' });
    expect(result.value.toxicity).toEqual({ cats: 'toxic', dogs: 'non_toxic' });
    expect(result.value.temperature.min_c).toBe(15);
    expect(result.value.misting).toBeNull();
    expect(result.value.tips).toEqual(['Un', 'Deux', 'Trois', 'Quatre', 'Cinq']);
  });

  it('treats a misting interval of 0 as no misting', () => {
    const result = validateCareSheet({ ...monstera, misting: { interval_days: 0 } });
    expect(result.ok && result.value.misting).toBeNull();
  });

  it('keeps task intervals within what the database accepts', () => {
    expect(errorsOf({ ...monstera, watering: { ...monstera.watering, interval_days: 0 } })).toEqual([
      'watering.interval_days : entier entre 1 et 730 attendu (reçu : 0)',
    ]);
    expect(errorsOf({ ...monstera, repotting: { interval_days: 1095 } })).toHaveLength(1);
    expect(errorsOf({ ...monstera, misting: { interval_days: -2 } })).toHaveLength(1);
  });

  it('rejects impossible temperatures, unknown values and too few tips', () => {
    expect(errorsOf({ ...monstera, temperature: { min_c: 25, max_c: 18 } })[0]).toMatch(/^temperature : min_c/);
    expect(errorsOf({ ...monstera, light: 'moonlight' })[0]).toMatch(/^light : une valeur parmi full_sun/);
    expect(errorsOf({ ...monstera, tips: ['Un seul'] })[0]).toMatch(/^tips : entre 2 et 5/);
  });

  it('lists every missing field', () => {
    const errors = errorsOf({ common_name: 'Pothos' });
    expect(errors).toContain('watering : objet attendu (reçu : absent)');
    expect(errors).toContain('scientific_name : texte non vide attendu (reçu : absent)');
    expect(errors.length).toBeGreaterThan(5);
    expect(errorsOf('Pothos')[0]).toBe('réponse : objet attendu (reçu : "Pothos")');
  });
});

describe('tasks suggested by a sheet', () => {
  it('waters and mists from today, feeds and repots after one interval', () => {
    expect(careSheetTasks(monstera, '2026-09-23')).toEqual([
      { kind: 'water', label: null, interval_days: 7, winter_factor: 1.5, next_due_on: '2026-09-23' },
      { kind: 'fertilize', label: null, interval_days: 14, winter_factor: 2, next_due_on: '2026-10-07' },
      { kind: 'mist', label: null, interval_days: 4, winter_factor: 1, next_due_on: '2026-09-23' },
      { kind: 'repot', label: null, interval_days: 730, winter_factor: 1, next_due_on: '2028-09-22' },
    ]);
  });

  it('leaves out misting when the plant does not need it', () => {
    const kinds = careSheetTasks({ ...monstera, misting: null }, '2026-09-23').map((t) => t.kind);
    expect(kinds).toEqual(['water', 'fertilize', 'repot']);
  });

  it('spaces the first feed in winter and snaps the winter factor to the form’s choices', () => {
    const tasks = careSheetTasks({ ...monstera, watering: { ...monstera.watering, winter_factor: 1.8 } }, '2026-12-01');
    expect(tasks[0].winter_factor).toBe(2);
    // 14 days ×2 in winter.
    expect(tasks[1].next_due_on).toBe('2026-12-29');
  });
});

describe('identification validation', () => {
  it('sorts, deduplicates and keeps three candidates', () => {
    const result = validateIdentification({
      is_plant: true,
      candidates: [
        { scientific_name: 'Epipremnum aureum', common_name: 'Pothos', confidence: 0.2 },
        { scientific_name: 'Monstera deliciosa', common_name: 'Faux philodendron', confidence: 85 },
        { scientific_name: 'monstera deliciosa', common_name: 'Monstera', confidence: 0.3 },
        { scientific_name: 'Philodendron hederaceum', common_name: 'Philodendron', confidence: '0,1' },
        { scientific_name: 'Scindapsus pictus', common_name: 'Scindapsus', confidence: 0.05 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.map((c) => [c.scientific_name, c.confidence])).toEqual([
      ['Monstera deliciosa', 0.85],
      ['Epipremnum aureum', 0.2],
      ['Philodendron hederaceum', 0.1],
    ]);
  });

  it('accepts a photo without a plant', () => {
    expect(validateIdentification({ is_plant: false, candidates: [] })).toEqual({
      ok: true,
      value: { is_plant: false, candidates: [] },
    });
  });

  it('needs a species when it says it is a plant', () => {
    const result = validateIdentification({ is_plant: true, candidates: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects a candidate without confidence', () => {
    const result = validateIdentification({
      is_plant: true,
      candidates: [{ scientific_name: 'Monstera deliciosa', common_name: 'Faux philodendron' }],
    });
    expect(result.ok ? [] : result.errors).toEqual([
      'candidates[0].confidence : nombre entre 0 et 1 attendu (reçu : absent)',
    ]);
  });
});

describe('sheet wording', () => {
  it('says how confident the model is', () => {
    expect(confidenceText(0.82)).toBe('Très probable · 82 %');
    expect(confidenceText(0.5)).toBe('Probable · 50 %');
    expect(confidenceText(0.05)).toBe('Peu probable · 5 %');
  });

  it('writes long intervals in months or years', () => {
    expect(formatCareInterval(7)).toBe('toutes les semaines');
    expect(formatCareInterval(90)).toBe('tous les 3 mois');
    expect(formatCareInterval(365)).toBe('tous les ans');
    expect(formatCareInterval(730)).toBe('tous les 2 ans');
  });

  it('describes toxicity for cats and dogs', () => {
    expect(toxicityText({ cats: 'toxic', dogs: 'toxic' })).toBe('Toxique pour les chats et les chiens');
    expect(toxicityText({ cats: 'toxic', dogs: 'non_toxic' })).toBe(
      'Toxique pour les chats, sans danger pour les chiens',
    );
  });
});
