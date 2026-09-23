import { describe, expect, it } from '@jest/globals';

import {
  careSheetTasks,
  isSheetComplete,
  nextRepotDay,
  toxicityText,
  validateCareSheet,
  type CareSheet,
} from './care-sheet';

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
  repotting: { interval_days: 730, advice: 'Au printemps, dans un pot 3 à 5 cm plus large.' },
  substrate: 'Terreau pour plantes vertes allégé d’écorce de pin.',
  pot: 'Pot percé et lourd, pour qu’elle ne bascule pas.',
  propagation: 'Bouture une tige avec un nœud dans l’eau.',
  problems: [
    { symptom: 'Feuilles jaunes', cause: 'Trop d’eau', fix: 'Espace les arrosages.' },
    { symptom: 'Feuilles sans découpes', cause: 'Manque de lumière', fix: 'Rapproche-la d’une fenêtre.' },
  ],
  tips: ['Donne-lui un tuteur.', 'Dépoussière les feuilles.'],
};

/** A sheet stored before repotting advice, substrate, pot, propagation and problems existed. */
const { substrate, pot, propagation, problems, ...olderFields } = monstera;
const olderSheet = { ...olderFields, repotting: { interval_days: 730 } };

function errorsOf(value: unknown, strict = false): string[] {
  const result = validateCareSheet(value, { strict });
  return result.ok ? [] : result.errors;
}

describe('care sheet validation', () => {
  it('accepts a complete sheet as is', () => {
    expect(validateCareSheet(JSON.parse(JSON.stringify(monstera)))).toEqual({ ok: true, value: monstera });
    expect(validateCareSheet(JSON.parse(JSON.stringify(monstera)), { strict: true })).toEqual({
      ok: true,
      value: monstera,
    });
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

describe('fields added to the sheets', () => {
  it('reads an older stored sheet with them empty', () => {
    const result = validateCareSheet(JSON.parse(JSON.stringify(olderSheet)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.repotting).toEqual({ interval_days: 730, advice: '' });
    expect(result.value).toMatchObject({ substrate: '', pot: '', propagation: '', problems: [] });
    expect(result.value.tips).toEqual(monstera.tips);
  });

  it('requires them from a new sheet, and says so to the model', () => {
    expect(errorsOf(olderSheet, true)).toEqual([
      'propagation : texte attendu, "" si elle se multiplie mal à la maison (reçu : absent)',
      'problems : entre 1 et 3 problèmes attendus, chacun avec symptom, cause et fix non vides (reçu : absent)',
      'repotting.advice : texte non vide attendu (reçu : absent)',
      'substrate : texte non vide attendu (reçu : absent)',
      'pot : texte non vide attendu (reçu : absent)',
    ]);
  });

  it('takes an empty propagation, but not placeholders elsewhere', () => {
    expect(errorsOf({ ...monstera, propagation: '' }, true)).toEqual([]);
    expect(errorsOf({ ...monstera, substrate: '…', pot: 'N/A' }, true)).toEqual([
      'substrate : texte non vide attendu (reçu : "…")',
      'pot : texte non vide attendu (reçu : "N/A")',
    ]);
    // Read back leniently, placeholders become empty.
    const result = validateCareSheet({ ...monstera, substrate: '…', propagation: 'Aucune.' });
    expect(result.ok && [result.value.substrate, result.value.propagation]).toEqual(['', '']);
  });

  it('keeps three complete problems at most', () => {
    const result = validateCareSheet(
      {
        ...monstera,
        problems: [
          { symptom: 'Feuilles jaunes', cause: 'Trop d’eau', fix: 'Espace les arrosages.' },
          { symptom: 'Taches brunes', cause: '', fix: 'Coupe les feuilles abîmées.' },
          'Cochenilles',
          { symptom: ' Feuilles   molles ', cause: 'Soif', fix: 'Arrose.' },
          { symptom: 'Tiges étirées', cause: 'Manque de lumière', fix: 'Rapproche-la de la fenêtre.' },
          { symptom: 'Racines brunes', cause: 'Pourriture', fix: 'Rempote.' },
        ],
      },
      { strict: true },
    );
    expect(result.ok && result.value.problems.map((p) => p.symptom)).toEqual([
      'Feuilles jaunes',
      'Feuilles molles',
      'Tiges étirées',
    ]);
    expect(errorsOf({ ...monstera, problems: [{ symptom: 'Feuilles jaunes' }] }, true)[0]).toMatch(/^problems : /);
  });

  it('cuts overlong texts at a word', () => {
    const long = 'Un terreau très drainant '.repeat(20);
    const result = validateCareSheet({ ...monstera, substrate: long }, { strict: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.substrate.length).toBeLessThanOrEqual(160);
    expect(result.value.substrate).toMatch(/[a-z]…$/);
  });

  it('tells older sheets apart, to offer to complete them', () => {
    expect(isSheetComplete(monstera)).toBe(true);
    expect(isSheetComplete({ ...monstera, propagation: '' })).toBe(true);
    const older = validateCareSheet(olderSheet);
    expect(older.ok && isSheetComplete(older.value)).toBe(false);
    expect(isSheetComplete({ ...monstera, problems: [] })).toBe(false);
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

  it('repots right away when the scan says so, from March to August', () => {
    const repot = (from: string) =>
      careSheetTasks(monstera, from, { repotNow: true }).find((t) => t.kind === 'repot');
    expect(repot('2026-06-15')).toEqual({
      kind: 'repot',
      label: null,
      interval_days: 730,
      winter_factor: 1,
      next_due_on: '2026-06-15',
    });
    // Not in autumn or winter: the plant rests.
    expect(repot('2026-09-23')?.next_due_on).toBe('2027-03-01');
    expect(repot('2026-12-01')?.next_due_on).toBe('2027-03-01');
    // Other tasks do not change.
    expect(careSheetTasks(monstera, '2026-06-15', { repotNow: true }).slice(0, 3)).toEqual(
      careSheetTasks(monstera, '2026-06-15').slice(0, 3),
    );
  });

  it('knows the next day a plant can be repotted', () => {
    expect(nextRepotDay('2026-03-01')).toBe('2026-03-01');
    expect(nextRepotDay('2026-08-31')).toBe('2026-08-31');
    expect(nextRepotDay('2026-09-01')).toBe('2027-03-01');
    expect(nextRepotDay('2027-01-10')).toBe('2027-03-01');
    expect(nextRepotDay('2027-02-28')).toBe('2027-03-01');
  });
});

describe('sheet wording', () => {
  it('describes toxicity for cats and dogs', () => {
    expect(toxicityText({ cats: 'toxic', dogs: 'toxic' })).toBe('Toxique pour les chats et les chiens');
    expect(toxicityText({ cats: 'toxic', dogs: 'non_toxic' })).toBe(
      'Toxique pour les chats, sans danger pour les chiens',
    );
  });
});
