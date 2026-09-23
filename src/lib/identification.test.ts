import { describe, expect, it } from '@jest/globals';

import {
  confidenceText,
  EMPTY_FINDINGS,
  hasFindings,
  linkCandidate,
  parseFindings,
  potText,
  serializeFindings,
  validateIdentification,
  type PhotoFindings,
} from './identification';

const candidates = [{ scientific_name: 'Monstera deliciosa', common_name: 'Faux philodendron', confidence: 0.8 }];

const findings: PhotoFindings = {
  pot: { material: 'terracotta', diameter_cm: 17 },
  repot: { needed: 'yes', reason: 'Des racines sortent par le trou du pot.' },
  observations: ['Feuilles du bas jaunies', 'Terre sèche en surface'],
};

/** The photo findings of an answer that is otherwise fine. */
function photoOf(photo: unknown): PhotoFindings | null {
  const result = validateIdentification({ is_plant: true, candidates, photo });
  return result.ok ? result.value.photo : null;
}

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

  it('accepts a photo without a plant, and ignores what it says of the pot', () => {
    expect(validateIdentification({ is_plant: false, candidates: [], photo: findings })).toEqual({
      ok: true,
      value: { is_plant: false, candidates: [], photo: EMPTY_FINDINGS },
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

describe('candidates and the reference base', () => {
  it('links a candidate and names it after the base', () => {
    expect(
      linkCandidate({ scientific_name: 'Sansevieria trifasciata', common_name: 'Sansevière', confidence: 0.8 }),
    ).toEqual({
      scientific_name: 'Dracaena trifasciata',
      // The model's name is kept: it is one of the base's.
      common_name: 'Sansevière',
      confidence: 0.8,
      reference_id: 'dracaena-trifasciata',
    });
    expect(
      linkCandidate({ scientific_name: 'Epipremnum aureum', common_name: 'Golden pothos', confidence: 0.5 }),
    ).toMatchObject({ scientific_name: 'Epipremnum aureum', common_name: 'Pothos', reference_id: 'epipremnum-aureum' });
  });

  it('links by the common name only when the genus agrees', () => {
    expect(
      linkCandidate({ scientific_name: 'Sansevieria laurentii', common_name: 'Langue de belle-mère', confidence: 0.6 }),
    ).toMatchObject({ reference_id: 'dracaena-trifasciata' });
    expect(
      linkCandidate({ scientific_name: 'Aglaonema pictum', common_name: 'Pothos', confidence: 0.6 }),
    ).toEqual({ scientific_name: 'Aglaonema pictum', common_name: 'Pothos', confidence: 0.6, reference_id: null });
  });

  it('keeps a species the base does not know as the model wrote it', () => {
    const candidate = { scientific_name: 'Ctenanthe burle-marxii', common_name: 'Ctenanthe', confidence: 0.4 };
    expect(linkCandidate(candidate)).toEqual({ ...candidate, reference_id: null });
  });

  it('merges candidates that are the same plant of the base', () => {
    const result = validateIdentification({
      is_plant: true,
      candidates: [
        { scientific_name: 'Dracaena trifasciata', common_name: 'Sansevieria', confidence: 0.7 },
        { scientific_name: 'Sansevieria trifasciata', common_name: 'Langue de belle-mère', confidence: 0.2 },
        { scientific_name: 'Dracaena angolensis', common_name: 'Sansevieria cylindrica', confidence: 0.1 },
      ],
    });
    expect(result.ok && result.value.candidates.map((c) => [c.scientific_name, c.reference_id])).toEqual([
      ['Dracaena trifasciata', 'dracaena-trifasciata'],
      ['Dracaena angolensis', 'dracaena-angolensis'],
    ]);
  });
});

describe('photo findings', () => {
  it('reads what the model saw', () => {
    expect(photoOf(JSON.parse(JSON.stringify(findings)))).toEqual(findings);
  });

  it('reads a missing or garbled photo as unknown, without failing the species', () => {
    expect(photoOf(undefined)).toEqual(EMPTY_FINDINGS);
    expect(photoOf('rien à signaler')).toEqual(EMPTY_FINDINGS);
    expect(photoOf({ pot: true, repot: { needed: 'peut-être', reason: 'On ne voit pas les racines.' } })).toEqual(
      EMPTY_FINDINGS,
    );
    expect(photoOf({ pot: { material: 'unknown', diameter_cm: 0 }, repot: {}, observations: ['…'] })).toEqual(
      EMPTY_FINDINGS,
    );
  });

  it('takes the synonyms a small model writes for the pot', () => {
    const material = (value: unknown) => photoOf({ pot: { material: value } })?.pot.material;
    expect(material('terre cuite')).toBe('terracotta');
    expect(material('Pot en terre cuite')).toBe('terracotta');
    expect(material('Plastique')).toBe('plastic');
    expect(material('CÉRAMIQUE émaillée')).toBe('ceramic');
    expect(material('in_ground')).toBe('none');
    expect(material('En pleine terre')).toBe('none');
    expect(material('osier')).toBe('other');
    expect(material('inconnu')).toBe('unknown');
    expect(material('Pot en métal')).toBe('other');
    expect(material('???')).toBe('unknown');
    expect(material(null)).toBe('unknown');
  });

  it('keeps plausible pot sizes only', () => {
    const diameter = (value: unknown) =>
      photoOf({ pot: { material: 'plastic', diameter_cm: value } })?.pot.diameter_cm;
    expect(diameter(17)).toBe(17);
    expect(diameter(12.6)).toBe(13);
    expect(diameter('environ 20 cm')).toBe(20);
    expect(diameter('15 à 20 cm')).toBe(18);
    expect(diameter(0)).toBeNull();
    expect(diameter(3)).toBeNull();
    expect(diameter(120)).toBeNull();
    expect(diameter('grand')).toBeNull();
    // Planted in the ground: no pot to measure.
    expect(photoOf({ pot: { material: 'none', diameter_cm: 40 } })?.pot).toEqual({
      material: 'none',
      diameter_cm: null,
    });
  });

  it('reads a pot written as text or as a size, and a bare yes for the repotting', () => {
    expect(photoOf({ pot: 'Terre cuite, 20 cm', repot: 'oui' })).toEqual({
      ...EMPTY_FINDINGS,
      pot: { material: 'terracotta', diameter_cm: 20 },
      repot: { needed: 'yes', reason: '' },
    });
    expect(photoOf({ pot: 12 })?.pot).toEqual({ material: 'unknown', diameter_cm: 12 });
  });

  it('reads a flattened answer', () => {
    const result = validateIdentification({ is_plant: true, candidates, ...findings });
    expect(result.ok && result.value.photo).toEqual(findings);
  });

  it('takes yes and no in several forms, and drops the reason when unknown', () => {
    const repot = (needed: unknown) => photoOf({ repot: { needed, reason: 'Racines visibles' } })?.repot;
    expect(repot(true)).toEqual({ needed: 'yes', reason: 'Racines visibles' });
    expect(repot('Oui, des racines sortent')?.needed).toBe('yes');
    expect(repot('non')?.needed).toBe('no');
    expect(repot('pas besoin')?.needed).toBe('no');
    expect(repot('unknown')).toEqual({ needed: 'unknown', reason: '' });
    expect(photoOf({ repot: { needed: 'no', reason: 'N/A' } })?.repot).toEqual({ needed: 'no', reason: '' });
  });

  it('keeps three short observations at most', () => {
    const observations = photoOf({
      observations: [
        'Feuilles du bas jaunies',
        '',
        42,
        'feuilles du bas jaunies',
        '  Terre   sèche ',
        'Quelques taches brunes sur les feuilles qui se trouvent tout en haut de la plante, près de la fenêtre',
        'Tiges étirées',
      ],
    })?.observations;
    expect(observations).toHaveLength(3);
    expect(observations?.slice(0, 2)).toEqual(['Feuilles du bas jaunies', 'Terre sèche']);
    expect(observations?.[2].length).toBeLessThanOrEqual(80);
    expect(observations?.[2]).toMatch(/^Quelques taches brunes .*[a-z]…$/);
    expect(photoOf({ observations: 'Feuilles abîmées' })?.observations).toEqual(['Feuilles abîmées']);
  });
});

describe('passing findings between screens', () => {
  it('reads back what it wrote', () => {
    expect(parseFindings(serializeFindings(findings))).toEqual(findings);
    expect(parseFindings(serializeFindings(EMPTY_FINDINGS))).toEqual(EMPTY_FINDINGS);
  });

  it('gives null for a missing or unreadable parameter, without throwing', () => {
    expect(parseFindings(undefined)).toBeNull();
    expect(parseFindings('')).toBeNull();
    expect(parseFindings('{"pot": ')).toBeNull();
    expect(parseFindings('[1, 2]')).toBeNull();
    expect(parseFindings('"terracotta"')).toBeNull();
  });

  it('cleans up a tampered parameter', () => {
    expect(parseFindings('{"pot": {"material": "wood", "diameter_cm": 500}, "observations": [1]}')).toEqual({
      ...EMPTY_FINDINGS,
      pot: { material: 'other', diameter_cm: null },
    });
  });
});

describe('findings wording', () => {
  it('describes the pot', () => {
    expect(potText({ material: 'terracotta', diameter_cm: 20 })).toBe('Terre cuite, environ 20 cm');
    expect(potText({ material: 'plastic', diameter_cm: null })).toBe('Plastique');
    expect(potText({ material: 'unknown', diameter_cm: 18 })).toBe('Environ 18 cm');
    expect(potText({ material: 'other', diameter_cm: 18 })).toBe('Environ 18 cm');
    expect(potText({ material: 'none', diameter_cm: null })).toBe('En pleine terre');
    expect(potText({ material: 'unknown', diameter_cm: null })).toBeNull();
    expect(potText({ material: 'other', diameter_cm: null })).toBeNull();
  });

  it('knows when there is something to show', () => {
    expect(hasFindings(EMPTY_FINDINGS)).toBe(false);
    expect(hasFindings(findings)).toBe(true);
    expect(hasFindings({ ...EMPTY_FINDINGS, pot: { material: 'ceramic', diameter_cm: null } })).toBe(true);
    expect(hasFindings({ ...EMPTY_FINDINGS, pot: { material: 'other', diameter_cm: null } })).toBe(false);
    expect(hasFindings({ ...EMPTY_FINDINGS, repot: { needed: 'no', reason: '' } })).toBe(true);
    expect(hasFindings({ ...EMPTY_FINDINGS, observations: ['Terre sèche'] })).toBe(true);
  });

  it('says how confident the model is', () => {
    expect(confidenceText(0.82)).toBe('Très probable · 82 %');
    expect(confidenceText(0.5)).toBe('Probable · 50 %');
    expect(confidenceText(0.05)).toBe('Peu probable · 5 %');
  });
});
