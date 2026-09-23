import { describe, expect, it } from '@jest/globals';

import { REFERENCE_PLANTS } from '@/data/plants';

import { LIGHT_ORDER } from './labels';
import {
  findReference,
  getReference,
  referenceFacts,
  referenceKey,
  sameGenus,
  searchReferences,
} from './plant-reference';

const idOf = (name: string) => findReference(name)?.id ?? null;

describe('the reference base', () => {
  it('holds at least 150 plants', () => {
    expect(REFERENCE_PLANTS.length).toBeGreaterThanOrEqual(150);
  });

  it('has unique ids and scientific names', () => {
    const ids = REFERENCE_PLANTS.map((plant) => plant.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)+$/);
    const names = REFERENCE_PLANTS.map((plant) => referenceKey(plant.scientific_name));
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives each name, synonym and common name to one plant only', () => {
    const owners = new Map<string, string>();
    const clashes: string[] = [];
    for (const plant of REFERENCE_PLANTS) {
      for (const name of [plant.scientific_name, ...plant.synonyms, ...plant.common_names]) {
        const key = referenceKey(name);
        const owner = owners.get(key);
        if (owner && owner !== plant.id) clashes.push(`${name}: ${owner} and ${plant.id}`);
        owners.set(key, plant.id);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('finds every plant by each of its names', () => {
    const missed: string[] = [];
    for (const plant of REFERENCE_PLANTS) {
      for (const name of [plant.scientific_name, ...plant.synonyms, ...plant.common_names]) {
        if (idOf(name) !== plant.id) missed.push(`${name} → ${idOf(name)} instead of ${plant.id}`);
      }
    }
    expect(missed).toEqual([]);
  });

  it('keeps the figures within what the sheets and tasks accept', () => {
    for (const plant of REFERENCE_PLANTS) {
      const figures = [
        plant.watering.interval_days,
        plant.fertilizing_interval_days,
        plant.repotting_interval_days,
      ];
      for (const days of figures) {
        expect(Number.isInteger(days) && days >= 1 && days <= 730).toBe(true);
      }
      expect(Number.isInteger(plant.misting_interval_days)).toBe(true);
      expect(plant.misting_interval_days).toBeGreaterThanOrEqual(0);
      expect(plant.misting_interval_days).toBeLessThanOrEqual(730);
      expect([1, 1.5, 2, 3]).toContain(plant.watering.winter_factor);
      expect(plant.temperature.min_c).toBeLessThan(plant.temperature.max_c);
      expect(plant.temperature.min_c).toBeGreaterThanOrEqual(-30);
      expect(plant.temperature.max_c).toBeLessThanOrEqual(50);
      expect(LIGHT_ORDER).toContain(plant.light);
      expect(['low', 'medium', 'high']).toContain(plant.humidity);
      for (const toxicity of [plant.toxicity.cats, plant.toxicity.dogs]) {
        expect(['toxic', 'non_toxic', 'unknown']).toContain(toxicity);
      }
    }
  });

  it('names each plant in French and cites its sources', () => {
    for (const plant of REFERENCE_PLANTS) {
      expect(plant.common_names.length).toBeGreaterThan(0);
      expect(plant.sources.some((source) => source.startsWith('https://www.wikidata.org/wiki/Q'))).toBe(true);
      // Toxicity is known from the ASPCA lists, or said to be unknown.
      const known = plant.toxicity.cats !== 'unknown' || plant.toxicity.dogs !== 'unknown';
      const aspca = plant.sources.some((source) => source.startsWith('https://www.aspca.org/'));
      if (known && !aspca) expect(plant.toxicity).toEqual({ cats: 'toxic', dogs: 'toxic' });
    }
  });

  it('covers the usual houseplants, balcony plants and herbs', () => {
    for (const name of ['Monstera', 'Pothos', 'Sansevieria', 'Géranium', 'Pétunia', 'Basilic', 'Romarin', 'Menthe']) {
      expect(findReference(name)).not.toBeNull();
    }
  });
});

describe('finding a plant', () => {
  it('ignores case, accents and punctuation', () => {
    expect(idOf('MONSTERA DELICIOSA')).toBe('monstera-deliciosa');
    expect(idOf('pelargonium')).toBe('pelargonium-hortorum');
    expect(idOf('oeillet d’inde')).toBe('tagetes-patula');
    expect(idOf("Œillet d'Inde")).toBe('tagetes-patula');
    expect(idOf('plante araignee')).toBe('chlorophytum-comosum');
    expect(idOf('Laurier rose')).toBe('nerium-oleander');
    expect(idOf('  Langue   de belle-mère ')).toBe('dracaena-trifasciata');
  });

  it('knows older scientific names', () => {
    expect(idOf('Sansevieria trifasciata')).toBe('dracaena-trifasciata');
    expect(idOf('Rosmarinus officinalis')).toBe('salvia-rosmarinus');
    expect(idOf('Calathea orbifolia')).toBe('goeppertia-orbifolia');
    expect(idOf('Scindapsus aureus')).toBe('epipremnum-aureum');
  });

  it('knows French common names', () => {
    expect(idOf('Pothos')).toBe('epipremnum-aureum');
    expect(idOf('Faux philodendron')).toBe('monstera-deliciosa');
    expect(idOf('Ciboulette')).toBe('allium-schoenoprasum');
    expect(idOf('Plante des concierges')).toBe('aspidistra-elatior');
  });

  it('reads hybrids, cultivars, ranks, articles and plurals', () => {
    expect(idOf('Alocasia x amazonica')).toBe('alocasia-amazonica');
    expect(idOf('Pelargonium hortorum')).toBe('pelargonium-hortorum');
    expect(idOf("Monstera deliciosa 'Thai Constellation'")).toBe('monstera-deliciosa');
    expect(idOf('Pothos ‘Marble Queen’')).toBe('epipremnum-aureum');
    expect(idOf('Ficus elastica Tineke')).toBe('ficus-elastica');
    expect(idOf('Phalaenopsis spp.')).toBe('phalaenopsis-amabilis');
    expect(idOf('la ciboulette')).toBe('allium-schoenoprasum');
    expect(idOf('Tomates')).toBe('solanum-lycopersicum');
    expect(idOf('Plantes araignées')).toBe('chlorophytum-comosum');
  });

  it('does not guess from a genus alone', () => {
    expect(findReference('Ficus alii')).toBeNull();
    expect(findReference('Plantus inventus')).toBeNull();
    expect(findReference('Calathea')).toBeNull();
    expect(findReference('')).toBeNull();
    expect(findReference('…')).toBeNull();
  });

  it('finds an entry by id', () => {
    expect(getReference('monstera-deliciosa')?.scientific_name).toBe('Monstera deliciosa');
    expect(getReference('nope')).toBeNull();
  });

  it('compares genera with the synonyms too', () => {
    const snakePlant = getReference('dracaena-trifasciata')!;
    expect(sameGenus(snakePlant, 'Sansevieria laurentii')).toBe(true);
    expect(sameGenus(snakePlant, 'Dracaena marginata')).toBe(true);
    expect(sameGenus(snakePlant, 'Monstera deliciosa')).toBe(false);
  });
});

describe('suggestions while typing', () => {
  const found = (query: string) => searchReferences(query).map((match) => [match.plant.id, match.name]);

  it('puts the exact name first, then the names starting with it', () => {
    expect(found('monstera')).toEqual([
      ['monstera-deliciosa', 'Monstera'],
      ['monstera-adansonii', 'Monstera adansonii'],
      ['rhaphidophora-tetrasperma', 'Monstera minima'],
    ]);
  });

  it('matches any word of a name, without accents or case', () => {
    expect(found('GRUY')).toEqual([['monstera-deliciosa', 'Plante gruyère']]);
    expect(found('plante gru')).toEqual([['monstera-deliciosa', 'Plante gruyère']]);
    expect(found('orchidee')[0]).toEqual(['phalaenopsis-amabilis', 'Orchidée']);
  });

  it('gives each plant once, with its best name', () => {
    const ids = searchReferences('ficus', 20).map((match) => match.plant.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(found('ficus')[0]).toEqual(['ficus-benjamina', 'Ficus']);
  });

  it('waits for 2 letters, and keeps to the limit', () => {
    expect(searchReferences('m')).toEqual([]);
    expect(searchReferences('  ')).toEqual([]);
    expect(searchReferences('ficus')).toHaveLength(5);
    expect(searchReferences('ficus', 2)).toHaveLength(2);
    expect(searchReferences('zzz')).toEqual([]);
  });
});

describe('the facts given to the model', () => {
  it('spells out every figure of the entry', () => {
    const facts = referenceFacts(getReference('monstera-deliciosa')!);
    expect(facts).toContain('Données vérifiées pour Monstera deliciosa (Faux philodendron)');
    expect(facts).toContain('- lumière : lumineux, sans soleil direct');
    expect(facts).toContain('- arrosage : tous les 7 jours au printemps et en été, 1,5 fois plus espacé de novembre à février');
    expect(facts).toContain('- humidité de l’air : moyenne');
    expect(facts).toContain('- températures supportées : de 15 à 30 °C');
    expect(facts).toContain('- toxicité : toxique pour les chats et les chiens');
    expect(facts).toContain('- engrais : tous les 14 jours au printemps et en été');
    expect(facts).toContain('- brumisation : pas nécessaire');
    expect(facts).toContain('- rempotage : tous les 2 ans');
  });

  it('keeps the rhythm in winter when the factor is 1', () => {
    expect(referenceFacts(getReference('ocimum-basilicum')!)).toContain('au même rythme en hiver');
    expect(referenceFacts(getReference('goeppertia-orbifolia')!)).toContain('- brumisation : tous les 3 jours');
  });
});
