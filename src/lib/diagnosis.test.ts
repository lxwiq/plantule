import { describe, expect, it } from '@jest/globals';

import {
  DIAGNOSIS_SCHEMA,
  suggestedWateringInterval,
  validateDiagnosis,
  type Diagnosis,
} from './diagnosis';

const diagnosis: Diagnosis = {
  status: 'treat',
  summary: 'Le terreau reste humide et les feuilles jaunissent : sans doute trop d’eau.',
  problems: [
    {
      name: 'Excès d’arrosage',
      kind: 'care',
      confidence: 0.7,
      signs: 'Feuilles jaunes et molles, terreau encore humide deux fois de suite.',
      actions: ['Laisse sécher le terreau avant d’arroser.', 'Vide la soucoupe.'],
    },
    {
      name: 'Cochenilles',
      kind: 'pest',
      confidence: 0.2,
      signs: 'Petits points blancs sur une tige.',
      actions: ['Regarde le dessous des feuilles.'],
    },
  ],
  watering_change: 'less',
  light_change: 'none',
};

function errorsOf(value: unknown, strict = true): string[] {
  const result = validateDiagnosis(value, { strict });
  return result.ok ? [] : result.errors;
}

describe('diagnosis validation', () => {
  it('accepts a complete diagnosis as is, strict or not', () => {
    const json = JSON.parse(JSON.stringify(diagnosis));
    expect(validateDiagnosis(json, { strict: true })).toEqual({ ok: true, value: diagnosis });
    expect(validateDiagnosis(json)).toEqual({ ok: true, value: diagnosis });
  });

  it('accepts a healthy plant without problems', () => {
    const healthy = { status: 'healthy', summary: 'Elle a l’air en forme.', problems: [], watering_change: 'none', light_change: 'none' };
    expect(validateDiagnosis(healthy, { strict: true })).toEqual({ ok: true, value: healthy });
  });

  it('forgives the slips of a small model', () => {
    const result = validateDiagnosis(
      {
        status: 'À surveiller',
        summary: '  Des   pistes à vérifier. ',
        problems: [
          { name: 'Cochenilles', kind: 'parasite', confidence: '20', signs: 'Points blancs.', actions: 'Isole-la.' },
          { name: 'Air sec', kind: 'Environment', confidence: 85, signs: 'Pointes sèches.', actions: ['Brumise.', 'brumise.'] },
        ],
        watering_change: 'moins',
        light_change: 'None',
      },
      { strict: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('watch');
    expect(result.value.summary).toBe('Des pistes à vérifier.');
    // Most likely first.
    expect(result.value.problems.map((p) => [p.name, p.kind, p.confidence])).toEqual([
      ['Air sec', 'environment', 0.85],
      ['Cochenilles', 'pest', 0.2],
    ]);
    expect(result.value.problems[0].actions).toEqual(['Brumise.']);
    expect(result.value.problems[1].actions).toEqual(['Isole-la.']);
    expect(result.value.watering_change).toBe('less');
    expect(result.value.light_change).toBe('none');
  });

  it('keeps the three most likely problems', () => {
    const problems = [0.1, 0.5, 0.3, 0.9].map((confidence) => ({ ...diagnosis.problems[0], name: `P${confidence}`, confidence }));
    const result = validateDiagnosis({ ...diagnosis, problems }, { strict: true });
    expect(result.ok && result.value.problems.map((p) => p.name)).toEqual(['P0.9', 'P0.5', 'P0.3']);
  });

  it('sends incomplete problems back to the model', () => {
    const errors = errorsOf({
      ...diagnosis,
      problems: [{ name: 'Excès d’arrosage', kind: 'maybe', signs: '…', actions: [] }],
    });
    expect(errors).toEqual([
      'problems[0].kind : une valeur parmi disease, pest, care, environment attendue (reçu : "maybe")',
      'problems[0].confidence : nombre entre 0 et 1 attendu (reçu : absent)',
      'problems[0].signs : texte non vide attendu (reçu : "…")',
      'problems[0].actions : entre 1 et 3 actions attendues (reçu : [])',
    ]);
  });

  it('asks for a problem when the plant needs care, and for every field', () => {
    expect(errorsOf({ status: 'treat', problems: [] })).toEqual([
      'problems : au moins un problème attendu quand status vaut treat (reçu : [])',
      'summary : texte non vide attendu (reçu : absent)',
      'watering_change : une valeur parmi less, more, none attendue (reçu : absent)',
      'light_change : une valeur parmi more, less, none attendue (reçu : absent)',
    ]);
    expect(errorsOf({ ...diagnosis, status: 'bof' })).toEqual([
      'status : une valeur parmi healthy, watch, treat attendue (reçu : "bof")',
    ]);
    expect(errorsOf('pas de JSON')).toContain('réponse : objet attendu (reçu : "pas de JSON")');
  });

  it('reads a damaged stored diagnosis without failing', () => {
    const result = validateDiagnosis({
      status: 'unknown',
      problems: [{ name: 'Oïdium', kind: '?', actions: 'Coupe les feuilles blanches.' }, { kind: 'pest' }, 'texte'],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        status: 'watch',
        summary: '',
        problems: [
          { name: 'Oïdium', kind: 'care', confidence: 0.5, signs: '', actions: ['Coupe les feuilles blanches.'] },
        ],
        watering_change: 'none',
        light_change: 'none',
      },
    });
  });
});

describe('diagnosis schema', () => {
  it('asks for every field, the problems first', () => {
    expect(DIAGNOSIS_SCHEMA.required).toEqual(['problems', 'status', 'summary', 'watering_change', 'light_change']);
    expect(Object.keys(DIAGNOSIS_SCHEMA.properties)[0]).toBe('problems');
    expect(DIAGNOSIS_SCHEMA.properties.problems.maxItems).toBe(3);
  });

  it('stays simple enough for the engine to constrain', () => {
    const json = JSON.stringify(DIAGNOSIS_SCHEMA);
    expect(json).not.toMatch(/anyOf|oneOf|allOf|"null"/);
  });
});

describe('watering interval after a diagnosis', () => {
  it('spaces waterings out by about a third for less water', () => {
    expect(suggestedWateringInterval(7, 'less')).toBe(9);
    expect(suggestedWateringInterval(10, 'less')).toBe(13);
    expect(suggestedWateringInterval(3, 'less')).toBe(4);
  });

  it('brings them closer by a quarter for more water', () => {
    expect(suggestedWateringInterval(7, 'more')).toBe(5);
    expect(suggestedWateringInterval(12, 'more')).toBe(9);
    expect(suggestedWateringInterval(2, 'more')).toBe(1);
  });

  it('always changes by at least a day, within 1 to 730 days', () => {
    expect(suggestedWateringInterval(1, 'less')).toBe(2);
    expect(suggestedWateringInterval(1, 'more')).toBeNull();
    expect(suggestedWateringInterval(700, 'less')).toBe(730);
    expect(suggestedWateringInterval(730, 'less')).toBeNull();
    expect(suggestedWateringInterval(7.4, 'less')).toBe(9);
  });

  it('offers nothing when the watering is fine', () => {
    expect(suggestedWateringInterval(7, 'none')).toBeNull();
    expect(suggestedWateringInterval(Number.NaN, 'less')).toBeNull();
  });
});
