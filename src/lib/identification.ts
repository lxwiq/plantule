/**
 * What the on-device model says about a photo: whether it shows a plant, and
 * up to three species it could be. The model can be wrong while sounding
 * sure, so the user always confirms the species.
 */

import { speciesKey } from './care-sheet';
import { JsonReader, type Validation } from './validate';

export type SpeciesCandidate = {
  scientific_name: string;
  /** In French. */
  common_name: string;
  /** From 0 to 1, as estimated by the model: a hint, not a probability. */
  confidence: number;
};

export type Identification = {
  is_plant: boolean;
  /** Most likely first, at most `MAX_CANDIDATES`. Empty when it is not a plant. */
  candidates: SpeciesCandidate[];
};

export const MAX_CANDIDATES = 3;

/** Passed to the engine, which can constrain its output to it. */
export const IDENTIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_plant', 'candidates'],
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
  },
} as const;

/**
 * Checks a parsed model answer. Candidates are sorted, deduplicated and cut
 * to three; a confidence written as a percentage (85) becomes 0.85.
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
    candidates.push({
      scientific_name: speciesKey(r.string(candidate.scientific_name, `${path}.scientific_name`, 80)),
      common_name: r.string(candidate.common_name, `${path}.common_name`, 80),
      confidence: r.number(confidence, `${path}.confidence`, 0, 1),
    });
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
  return r.result({ is_plant: isPlant, candidates: isPlant ? unique : [] });
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
