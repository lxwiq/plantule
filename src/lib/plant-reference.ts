/**
 * The reference base: checked care data for common plants, shipped with the
 * app (src/data/plants.ts). When a species is in it, its figures come from
 * here and the model only writes the advice around them.
 */

import { REFERENCE_PLANTS } from '@/data/plants';
import type { Light } from '@/db/types';

import { HUMIDITY_LABELS, toxicityText, type Humidity, type Toxicity } from './care-sheet';

export type ReferencePlant = {
  /** Stable slug, e.g. "monstera-deliciosa". Stored in `CareSheet.reference_id`. */
  id: string;
  /**
   * The name in current use, e.g. "Monstera deliciosa". A hybrid keeps its ×
   * ("Pelargonium × hortorum"); a few plants sold under an older name keep it,
   * with the newer one in the synonyms.
   */
  scientific_name: string;
  /** Other scientific names still in use (older names, cultivar groups). */
  synonyms: string[];
  /** French common names, most usual first. */
  common_names: string[];
  light: Light;
  watering: {
    /** Days between waterings in the growing season. */
    interval_days: number;
    /** Interval multiplier from November to February, 1 to 3. */
    winter_factor: number;
  };
  humidity: Humidity;
  temperature: { min_c: number; max_c: number };
  toxicity: { cats: Toxicity; dogs: Toxicity };
  fertilizing_interval_days: number;
  /** 0 when the plant does not need misting. */
  misting_interval_days: number;
  repotting_interval_days: number;
  /** Where the figures come from (names or URLs). */
  sources: string[];
};

/** The figures of a reference entry, also read from a sheet to describe it the same way. */
export type CareFigures = Pick<
  ReferencePlant,
  | 'light'
  | 'watering'
  | 'humidity'
  | 'temperature'
  | 'toxicity'
  | 'fertilizing_interval_days'
  | 'misting_interval_days'
  | 'repotting_interval_days'
>;

// Lookup

/**
 * The form names are compared in: lowercase, without accents, hybrid sign or
 * punctuation, single spaces. "Œillet d’Inde" → "oeillet d inde",
 * "Alocasia × amazonica" and "Alocasia x amazonica" → "alocasia amazonica".
 */
export function referenceKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(^| )x(?= )/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let index: Map<string, ReferencePlant> | null = null;
let byId: Map<string, ReferencePlant> | null = null;

/** Every name of every entry. The base keeps them unique (see its tests). */
function nameIndex(): Map<string, ReferencePlant> {
  if (index) return index;
  index = new Map();
  for (const plant of REFERENCE_PLANTS) {
    for (const name of [plant.scientific_name, ...plant.synonyms, ...plant.common_names]) {
      const key = referenceKey(name);
      if (key && !index.has(key)) index.set(key, plant);
    }
  }
  return index;
}

/** Cultivar in quotes: "Monstera deliciosa 'Thai Constellation'", "Pothos ‘N’Joy’". */
const CULTIVAR = /\s["'‘“«][^"“”«»]*$/;
/** "spp.", "var. …", "subsp. …", "cv. …" and what follows, in a key. */
const RANK = / (spp|sp|ssp|subsp|var|cv|f|hybride?s?)( .*)?$/;
const ARTICLE = /^(le|la|les|l|un|une|des|du) /;

/**
 * Keys to try for a name, most exact first: as written, without a cultivar or
 * a rank, without a French article, genus and species only, singular.
 */
function lookupKeys(name: string): string[] {
  const key = referenceKey(name);
  if (!key) return [];
  const keys = [key, referenceKey(name.replace(CULTIVAR, ''))];
  keys.push(key.replace(RANK, ''), key.replace(ARTICLE, ''));
  const words = keys[1].replace(RANK, '').split(' ');
  // "Ficus elastica Tineke": the first two words of a longer scientific-looking name.
  if (words.length > 2) keys.push(words.slice(0, 2).join(' '));
  // "Plantes araignées" → "plante araignee".
  keys.push(
    key
      .replace(ARTICLE, '')
      .split(' ')
      .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))
      .join(' '),
  );
  return keys.filter((k, i) => k && keys.indexOf(k) === i);
}

/**
 * The reference entry for a name, or null. Ignores case and accents, and
 * looks in the scientific name, the synonyms and the French common names.
 */
export function findReference(name: string): ReferencePlant | null {
  const names = nameIndex();
  for (const key of lookupKeys(name)) {
    const found = names.get(key);
    if (found) return found;
  }
  return null;
}

/** The entry with this id (as stored in `CareSheet.reference_id`), or null. */
export function getReference(id: string): ReferencePlant | null {
  byId ??= new Map(REFERENCE_PLANTS.map((plant) => [plant.id, plant]));
  return byId.get(id) ?? null;
}

/** Genus of a scientific name, as a key: "Sansevieria trifasciata" → "sansevieria". */
function genusKey(name: string): string {
  return referenceKey(name).split(' ')[0] ?? '';
}

/** Whether a scientific name has the genus of the entry or of one of its synonyms. */
export function sameGenus(plant: ReferencePlant, scientificName: string): boolean {
  const genus = genusKey(scientificName);
  return Boolean(genus) && [plant.scientific_name, ...plant.synonyms].some((name) => genusKey(name) === genus);
}

// Wording, for the model

const LIGHT_WORDS: Record<Light, string> = {
  full_sun: 'plein soleil',
  bright_indirect: 'lumineux, sans soleil direct',
  partial_shade: 'mi-ombre',
  shade: 'ombre',
};

/** "lumineux, sans soleil direct", as a phrase for the model. */
export function lightText(light: Light): string {
  return LIGHT_WORDS[light];
}

/** "tous les jours", "tous les 7 jours", "tous les ans", "tous les 2 ans". */
export function everyText(days: number): string {
  if (days === 1) return 'tous les jours';
  if (days % 365 === 0) return days === 365 ? 'tous les ans' : `tous les ${days / 365} ans`;
  return `tous les ${days} jours`;
}

const decimal = (value: number) => String(value).replace('.', ',');

/** The figures as short French lines, without a leading dash. */
export function figuresLines(figures: CareFigures): string[] {
  const { watering, temperature } = figures;
  const winter =
    watering.winter_factor === 1
      ? 'au même rythme en hiver'
      : `${decimal(watering.winter_factor)} fois plus espacé de novembre à février`;
  return [
    `lumière : ${LIGHT_WORDS[figures.light]}`,
    `arrosage : ${everyText(watering.interval_days)} au printemps et en été, ${winter}`,
    `humidité de l’air : ${HUMIDITY_LABELS[figures.humidity].toLowerCase()}`,
    `températures supportées : de ${temperature.min_c} à ${temperature.max_c} °C`,
    `toxicité : ${toxicityText(figures.toxicity).toLowerCase()}`,
    `engrais : ${everyText(figures.fertilizing_interval_days)} au printemps et en été`,
    `brumisation : ${
      figures.misting_interval_days > 0 ? everyText(figures.misting_interval_days) : 'pas nécessaire'
    }`,
    `rempotage : ${everyText(figures.repotting_interval_days)}`,
  ];
}

/** The entry's figures as a short French text, given to the model so it does not make up others. */
export function referenceFacts(plant: ReferencePlant): string {
  return [
    `Données vérifiées pour ${plant.scientific_name} (${plant.common_names[0]}), en pot :`,
    ...figuresLines(plant).map((line) => `- ${line}`),
  ].join('\n');
}
