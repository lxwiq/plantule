/**
 * What the on-device model says about a photo: whether it shows a plant, up
 * to three species it could be, and what the photo shows of its pot and
 * state. The model can be wrong while sounding sure, so the user always
 * confirms the species and the pot.
 */

import { speciesKey } from './care-sheet';
import { findReference, sameGenus } from './plant-reference';
import { enumKey, JsonReader, looseText, type Validation } from './validate';

export type SpeciesCandidate = {
  scientific_name: string;
  /** In French. */
  common_name: string;
  /** From 0 to 1, as estimated by the model: a hint, not a probability. */
  confidence: number;
  /**
   * The reference base entry it matches (src/lib/plant-reference.ts), or
   * null. Set by `validateIdentification`, which then also gives the
   * candidate the base's names.
   */
  reference_id?: string | null;
};

export type PotMaterial = 'terracotta' | 'plastic' | 'ceramic' | 'other' | 'none' | 'unknown';

/**
 * What the photo shows besides the species, read in the same pass. Rough
 * estimates offered to the user, never trusted blindly. A missing or garbled
 * part reads back as unknown instead of failing the identification.
 */
export type PhotoFindings = {
  pot: {
    /** "none": planted in the ground. */
    material: PotMaterial;
    /** Estimated diameter at the top, null when it cannot be told. */
    diameter_cm: number | null;
  };
  /** Signs it needs a bigger pot: roots out of the holes or over the soil, plant far too big for its pot. */
  repot: { needed: 'yes' | 'no' | 'unknown'; /** Short French reason, "" when none. */ reason: string };
  /** 0 to 3 short French notes on what matters for its care ("feuilles du bas jaunies"). */
  observations: string[];
};

export type Identification = {
  is_plant: boolean;
  /** Most likely first, at most `MAX_CANDIDATES`. Empty when it is not a plant. */
  candidates: SpeciesCandidate[];
  photo: PhotoFindings;
};

export const MAX_CANDIDATES = 3;

const POT_MATERIALS: readonly PotMaterial[] = ['terracotta', 'plastic', 'ceramic', 'other', 'none', 'unknown'];
const REPOT_NEEDS: readonly PhotoFindings['repot']['needed'][] = ['yes', 'no', 'unknown'];
/** Pot diameters outside this range are misreadings, and read as unknown. */
const MIN_POT_CM = 5;
const MAX_POT_CM = 80;
const MAX_OBSERVATIONS = 3;
const MAX_OBSERVATION_LENGTH = 80;
const MAX_REASON_LENGTH = 100;

/** Passed to the engine, which can constrain its output to it. */
export const IDENTIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_plant', 'candidates', 'photo'],
  properties: {
    is_plant: { type: 'boolean' },
    candidates: {
      type: 'array',
      maxItems: MAX_CANDIDATES,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['scientific_name', 'common_name', 'confidence'],
        properties: {
          scientific_name: { type: 'string', minLength: 1, maxLength: 80, description: 'Genre et espèce' },
          common_name: { type: 'string', minLength: 1, maxLength: 80, description: 'Nom commun en français' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    // "Unknown" is written 0 or "" rather than null: simpler for the engine to constrain.
    photo: {
      type: 'object',
      additionalProperties: false,
      required: ['pot', 'repot', 'observations'],
      properties: {
        pot: {
          type: 'object',
          additionalProperties: false,
          required: ['material', 'diameter_cm'],
          properties: {
            material: { type: 'string', enum: POT_MATERIALS },
            diameter_cm: {
              type: 'integer',
              minimum: 0,
              maximum: MAX_POT_CM,
              description: 'Diamètre du haut du pot en cm, 0 si on ne peut pas l’estimer',
            },
          },
        },
        repot: {
          type: 'object',
          additionalProperties: false,
          required: ['needed', 'reason'],
          properties: {
            needed: { type: 'string', enum: REPOT_NEEDS },
            reason: { type: 'string', maxLength: MAX_REASON_LENGTH },
          },
        },
        observations: {
          type: 'array',
          maxItems: MAX_OBSERVATIONS,
          items: { type: 'string', minLength: 1, maxLength: MAX_OBSERVATION_LENGTH },
        },
      },
    },
  },
} as const;

// Photo findings, read leniently: they never make the model run again.

export const EMPTY_FINDINGS: PhotoFindings = {
  pot: { material: 'unknown', diameter_cm: null },
  repot: { needed: 'unknown', reason: '' },
  observations: [],
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Words a small model writes for each material, looked for inside its answer, in this order. */
const POT_MATERIAL_WORDS: readonly [PotMaterial, readonly string[]][] = [
  ['unknown', ['unknown', 'inconnu', 'unclear', 'incertain', 'invisible', 'not_visible', 'pas_visible', 'aucun']],
  ['terracotta', ['terracotta', 'terracota', 'terra_cotta', 'terre_cuite', 'pot_en_terre', 'clay', 'argile']],
  ['plastic', ['plasti', 'pvc', 'polypropyl']],
  [
    'ceramic',
    ['ceramic', 'céramique', 'ceramique', 'porcel', 'faïence', 'faience', 'grès', 'stoneware', 'émail', 'glazed'],
  ],
  ['none', ['ground', 'pleine_terre', 'jardin', 'garden', 'massif', 'potager']],
  [
    'other',
    [
      'other',
      'autre',
      'metal',
      'métal',
      'zinc',
      'bois',
      'wood',
      'verre',
      'glass',
      'béton',
      'beton',
      'concrete',
      'ciment',
      'fibre',
      'fiber',
      'panier',
      'basket',
      'osier',
      'wicker',
      'rotin',
      'rattan',
      'résine',
      'resin',
      'pierre',
      'stone',
      'tissu',
      'fabric',
      'feutre',
      'jute',
      'bambou',
      'bamboo',
      'cache_pot',
    ],
  ],
];

function readPotMaterial(value: unknown): PotMaterial {
  if (typeof value !== 'string') return 'unknown';
  const key = enumKey(value);
  const exact = POT_MATERIALS.find((material) => material === key);
  if (exact) return exact;
  const found = POT_MATERIAL_WORDS.find(([, words]) => words.some((word) => key.includes(word)));
  return found ? found[0] : 'unknown';
}

const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const toNumber = (text: string) => Number(text.replace(',', '.'));

/** Whole centimetres within bounds, or null. "15 à 20 cm" reads as 18. */
function readDiameter(value: unknown): number | null {
  let cm: number | null = null;
  if (typeof value === 'number') {
    cm = value;
  } else if (typeof value === 'string') {
    const range = value.match(new RegExp(`(${NUMBER})\\s*(?:-|–|à|a|to)\\s*(${NUMBER})`));
    const single = value.match(new RegExp(NUMBER));
    if (range) cm = (toNumber(range[1]) + toNumber(range[2])) / 2;
    else if (single) cm = toNumber(single[0]);
  }
  if (cm === null || !Number.isFinite(cm)) return null;
  const rounded = Math.round(cm);
  return rounded >= MIN_POT_CM && rounded <= MAX_POT_CM ? rounded : null;
}

const YES_WORDS = [
  'yes',
  'oui',
  'true',
  'soon',
  'bientôt',
  'bientot',
  'conseillé',
  'conseille',
  'recommended',
  'needed',
];
const NO_WORDS = ['no', 'non', 'false', 'not_needed', 'pas_besoin', 'pas_nécessaire', 'pas_necessaire'];

function readRepotNeed(value: unknown): PhotoFindings['repot']['needed'] {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  if (typeof value !== 'string') return 'unknown';
  const key = enumKey(value);
  // "oui, des racines sortent" counts as yes.
  const firstWord = key.split(/[_,.;:!]/)[0];
  if (NO_WORDS.includes(key) || NO_WORDS.includes(firstWord)) return 'no';
  if (YES_WORDS.includes(key) || YES_WORDS.includes(firstWord)) return 'yes';
  return 'unknown';
}

function readObservations(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const observations: string[] = [];
  for (const item of items) {
    const text = looseText(item, MAX_OBSERVATION_LENGTH);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    observations.push(text);
    if (observations.length === MAX_OBSERVATIONS) break;
  }
  return observations;
}

/**
 * The findings in a parsed answer, whatever state they are in. Also takes a
 * pot written as plain text ("terre cuite, 20 cm") and a bare yes or no for
 * the repotting.
 */
function readFindings(value: unknown): PhotoFindings {
  const photo = isObject(value) ? value : {};
  const pot: JsonObject = isObject(photo.pot) ? photo.pot : { material: photo.pot, diameter_cm: photo.pot };
  const repot: JsonObject = isObject(photo.repot) ? photo.repot : { needed: photo.repot };
  const material = readPotMaterial(pot.material);
  const needed = readRepotNeed(repot.needed);
  return {
    pot: { material, diameter_cm: material === 'none' ? null : readDiameter(pot.diameter_cm) },
    repot: { needed, reason: needed === 'unknown' ? '' : looseText(repot.reason, MAX_REASON_LENGTH) },
    observations: readObservations(photo.observations),
  };
}

/**
 * The candidate linked to the reference base: found by its scientific name,
 * or by its common name when the genus agrees (a model sometimes writes an
 * old or made-up scientific name next to a right common name). A linked
 * candidate takes the base's scientific name, and its first common name
 * unless the model's one is also the base's.
 */
export function linkCandidate(candidate: SpeciesCandidate): SpeciesCandidate {
  const byName = findReference(candidate.scientific_name);
  const byCommonName = byName ? null : findReference(candidate.common_name);
  const reference =
    byName ?? (byCommonName && sameGenus(byCommonName, candidate.scientific_name) ? byCommonName : null);
  if (!reference) return { ...candidate, reference_id: null };
  const commonName =
    findReference(candidate.common_name)?.id === reference.id ? candidate.common_name : reference.common_names[0];
  return {
    ...candidate,
    scientific_name: reference.scientific_name,
    common_name: commonName,
    reference_id: reference.id,
  };
}

/**
 * Checks a parsed model answer. Candidates are linked to the reference base,
 * sorted, deduplicated and cut to three; a confidence written as a
 * percentage (85) becomes 0.85. Only the species can fail it: the photo
 * findings fall back to unknown.
 */
export function validateIdentification(value: unknown): Validation<Identification> {
  const r = new JsonReader();
  const root = r.object(value, 'réponse');
  const isPlant = r.boolean(root.is_plant, 'is_plant');
  const items = r.array(root.candidates ?? [], 'candidates');

  const candidates: SpeciesCandidate[] = [];
  items.forEach((item, index) => {
    const path = `candidates[${index}]`;
    const candidate = r.object(item, path);
    const raw = candidate.confidence;
    const number = typeof raw === 'string' ? Number.parseFloat(raw.replace(',', '.')) : raw;
    const confidence = typeof number === 'number' && number > 1 && number <= 100 ? number / 100 : number;
    candidates.push(
      linkCandidate({
        scientific_name: speciesKey(r.string(candidate.scientific_name, `${path}.scientific_name`, 80)),
        common_name: r.string(candidate.common_name, `${path}.common_name`, 80),
        confidence: r.number(confidence, `${path}.confidence`, 0, 1),
      }),
    );
  });

  const seen = new Set<string>();
  const unique = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .filter((c) => {
      const key = c.scientific_name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CANDIDATES);

  if (isPlant && items.length === 0) {
    r.fail('candidates', 'au moins une espèce attendue quand is_plant vaut true', root.candidates);
  }
  // A flattened answer puts pot, repot and observations next to the candidates.
  const photo = isPlant ? readFindings(root.photo ?? root) : readFindings(null);
  return r.result<Identification>({ is_plant: isPlant, candidates: isPlant ? unique : [], photo });
}

// Passing findings between screens

/** Route parameter form of the findings, read back by `parseFindings`. */
export function serializeFindings(findings: PhotoFindings): string {
  return JSON.stringify(findings);
}

/** The findings in a route parameter, or null when it is missing or unreadable. Never throws. */
export function parseFindings(param: string | undefined): PhotoFindings | null {
  if (typeof param !== 'string' || !param) return null;
  let value: unknown;
  try {
    value = JSON.parse(param);
  } catch {
    return null;
  }
  return isObject(value) ? readFindings(value) : null;
}

/** Whether the photo told anything worth showing: the pot, the repotting, or an observation. */
export function hasFindings(findings: PhotoFindings): boolean {
  return (
    potText(findings.pot) !== null || findings.repot.needed !== 'unknown' || findings.observations.length > 0
  );
}

// Wording

export const POT_MATERIAL_LABELS: Record<PotMaterial, string> = {
  terracotta: 'Terre cuite',
  plastic: 'Plastique',
  ceramic: 'Céramique',
  other: 'Autre',
  none: 'En pleine terre',
  unknown: 'Inconnu',
};

/**
 * "Terre cuite, environ 20 cm", "Plastique", "Environ 18 cm", "En pleine
 * terre", or null when nothing is known. "Other" says nothing useful about a
 * pot, so it only shows the size.
 */
export function potText({ material, diameter_cm }: PhotoFindings['pot']): string | null {
  if (material === 'none') return POT_MATERIAL_LABELS.none;
  const name = material === 'unknown' || material === 'other' ? null : POT_MATERIAL_LABELS[material];
  if (diameter_cm === null) return name;
  return name ? `${name}, environ ${diameter_cm} cm` : `Environ ${diameter_cm} cm`;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: 'Très probable',
  medium: 'Probable',
  low: 'Peu probable',
};

/** "Très probable · 85 %" */
export function confidenceText(confidence: number): string {
  return `${LEVEL_LABELS[confidenceLevel(confidence)]} · ${Math.round(confidence * 100)} %`;
}
