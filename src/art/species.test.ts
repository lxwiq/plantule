import { describe, expect, it } from '@jest/globals';

import { REFERENCE_PLANTS } from '@/data/plants';

import { artSpecForSpecies, REFERENCE_ART } from './species';
import { PLANT_KINDS } from './types';

const kindOf = (species: string | null | undefined) => artSpecForSpecies(species).kind;

describe('REFERENCE_ART', () => {
  it('draws every plant of the reference base with a known kind', () => {
    for (const plant of REFERENCE_PLANTS) {
      const spec = REFERENCE_ART[plant.id];
      expect([plant.id, spec && PLANT_KINDS.includes(spec.kind)]).toEqual([plant.id, true]);
      if (spec?.accent) expect(spec.accent).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('has no entry the base does not have', () => {
    const ids = new Set(REFERENCE_PLANTS.map((plant) => plant.id));
    expect(Object.keys(REFERENCE_ART).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe('artSpecForSpecies', () => {
  it('finds the plants of the base by any of their names', () => {
    expect(artSpecForSpecies('Monstera')).toEqual({ kind: 'monstera' });
    expect(kindOf('Faux philodendron')).toBe('monstera');
    expect(kindOf('Sansevieria trifasciata')).toBe('snake');
    expect(kindOf('Langue de belle-mère')).toBe('snake');
    expect(kindOf('Pothos ‘N’Joy’')).toBe('pothos');
    expect(artSpecForSpecies('géraniums')).toEqual(REFERENCE_ART['pelargonium-hortorum']);
    expect(artSpecForSpecies('Lavande')).toEqual({ kind: 'lavender', accent: expect.any(String) });
    expect(artSpecForSpecies('Tomate cerise').kind).toBe('veggie');
  });

  it('skips a determiner before the name', () => {
    expect(kindOf('Mon cactus de Noël')).toBe('cactus');
    expect(kindOf('ma Plante araignée')).toBe('spider');
  });

  it('falls back on the genus', () => {
    expect(kindOf('Philodendron birkin')).toBe('elephant_ear');
    expect(kindOf('Hoya linearis')).toBe('pothos');
    expect(kindOf('Calathea warscewiczii')).toBe('calathea');
    expect(kindOf('Mammillaria elongata')).toBe('cactus');
    expect(kindOf('Bouture de monstera')).toBe('monstera');
    // Flowers keep the color of their genus' first plant.
    expect(artSpecForSpecies('Pelargonium graveolens')).toEqual(REFERENCE_ART['pelargonium-hortorum']);
  });

  it('then on words naming a kind of plant', () => {
    expect(kindOf('Mon cactus')).toBe('cactus');
    expect(kindOf('basilic du jardin')).toBe('herbs');
    expect(kindOf('Plantes grasses du salon')).toBe('succulent');
    expect(kindOf('Petite fougère')).toBe('fern');
    expect(kindOf('ORCHIDÉE vanda')).toBe('orchid');
    expect(kindOf('Fraisier des bois')).toBe('veggie');
    expect(artSpecForSpecies('Citronnier de Menton')).toEqual(REFERENCE_ART['citrus-limon']);
  });

  it('draws the sprout for what it does not know', () => {
    expect(artSpecForSpecies(null)).toEqual({ kind: 'sprout' });
    expect(artSpecForSpecies(undefined)).toEqual({ kind: 'sprout' });
    expect(artSpecForSpecies('')).toEqual({ kind: 'sprout' });
    expect(artSpecForSpecies('  ')).toEqual({ kind: 'sprout' });
    expect(artSpecForSpecies('truc inconnu')).toEqual({ kind: 'sprout' });
  });
});
