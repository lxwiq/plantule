/**
 * Species care sheets written by the on-device model: their shape, the JSON
 * Schema the model is asked to follow, the validator its answers go through,
 * and the care tasks a sheet suggests for a new plant.
 */

import type { Light, TaskInput } from '@/db/types';

import { addDays, formatInterval, today } from './dates';
import { LIGHT_ORDER, TASK_KINDS } from './labels';
import { effectiveInterval, MAX_INTERVAL_DAYS } from './schedule';
import { JsonReader, type Validation } from './validate';

export type Humidity = 'low' | 'medium' | 'high';
export type Toxicity = 'toxic' | 'non_toxic' | 'unknown';

export type CareSheet = {
  /** In French, e.g. "Faux philodendron". */
  common_name: string;
  /** Genus and species, e.g. "Monstera deliciosa". */
  scientific_name: string;
  light: Light;
  watering: {
    /** Days between waterings in the growing season. */
    interval_days: number;
    /** Interval multiplier from November to February, 1 to 3. */
    winter_factor: number;
    advice: string;
  };
  /** Air humidity the plant likes. */
  humidity: Humidity;
  temperature: { min_c: number; max_c: number };
  toxicity: { cats: Toxicity; dogs: Toxicity };
  /** Days between feeds in the growing season (spring and summer). */
  fertilizing: { interval_days: number };
  /** Null when the plant does not need misting (the model writes an interval of 0). */
  misting: { interval_days: number } | null;
  repotting: { interval_days: number };
  /** 2 to 5 short tips, in French. */
  tips: string[];
};

const HUMIDITY_VALUES: readonly Humidity[] = ['low', 'medium', 'high'];
const TOXICITY_VALUES: readonly Toxicity[] = ['toxic', 'non_toxic', 'unknown'];
const MAX_TIPS = 5;
const MIN_TIPS = 2;
/** Winter factors offered by the task form; a sheet's factor snaps to the nearest one. */
const WINTER_FACTORS = [1, 1.5, 2, 3];

/** Synonyms a small model tends to write instead of the enum values. */
const LIGHT_ALIASES: Record<string, Light> = {
  sun: 'full_sun',
  direct_sun: 'full_sun',
  plein_soleil: 'full_sun',
  bright: 'bright_indirect',
  indirect: 'bright_indirect',
  bright_indirect_light: 'bright_indirect',
  lumineux: 'bright_indirect',
  partial_sun: 'partial_shade',
  half_shade: 'partial_shade',
  mi_ombre: 'partial_shade',
  low_light: 'shade',
  low: 'shade',
  ombre: 'shade',
};
const HUMIDITY_ALIASES: Record<string, Humidity> = {
  faible: 'low',
  moderate: 'medium',
  moyenne: 'medium',
  modérée: 'medium',
  moderee: 'medium',
  forte: 'high',
  élevée: 'high',
  elevee: 'high',
};
const TOXICITY_ALIASES: Record<string, Toxicity> = {
  yes: 'toxic',
  oui: 'toxic',
  true: 'toxic',
  toxique: 'toxic',
  no: 'non_toxic',
  non: 'non_toxic',
  false: 'non_toxic',
  safe: 'non_toxic',
  non_toxique: 'non_toxic',
  inconnu: 'unknown',
};

const interval = (description: string) => ({
  type: 'integer',
  minimum: 1,
  maximum: MAX_INTERVAL_DAYS,
  description,
});

const intervalObject = (description: string) => ({
  type: 'object',
  additionalProperties: false,
  required: ['interval_days'],
  properties: { interval_days: interval(description) },
});

const toxicitySchema = { type: 'string', enum: TOXICITY_VALUES };

/** Passed to the engine, which can constrain its output to it. */
export const CARE_SHEET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'common_name',
    'scientific_name',
    'light',
    'watering',
    'humidity',
    'temperature',
    'toxicity',
    'fertilizing',
    'misting',
    'repotting',
    'tips',
  ],
  properties: {
    common_name: { type: 'string', minLength: 1, maxLength: 80, description: 'Nom commun en français' },
    scientific_name: { type: 'string', minLength: 1, maxLength: 80, description: 'Genre et espèce' },
    light: { type: 'string', enum: LIGHT_ORDER },
    watering: {
      type: 'object',
      additionalProperties: false,
      required: ['interval_days', 'winter_factor', 'advice'],
      properties: {
        interval_days: interval('Jours entre deux arrosages au printemps et en été'),
        winter_factor: {
          type: 'number',
          minimum: 1,
          maximum: 3,
          description: 'Multiplicateur de l’intervalle de novembre à février',
        },
        advice: { type: 'string', minLength: 1, maxLength: 200 },
      },
    },
    humidity: { type: 'string', enum: HUMIDITY_VALUES },
    temperature: {
      type: 'object',
      additionalProperties: false,
      required: ['min_c', 'max_c'],
      properties: {
        min_c: { type: 'integer', minimum: -30, maximum: 30 },
        max_c: { type: 'integer', minimum: 0, maximum: 50 },
      },
    },
    toxicity: {
      type: 'object',
      additionalProperties: false,
      required: ['cats', 'dogs'],
      properties: { cats: toxicitySchema, dogs: toxicitySchema },
    },
    fertilizing: intervalObject('Jours entre deux apports d’engrais au printemps et en été'),
    // Flat rather than "object or null": simpler for the engine to constrain.
    misting: {
      type: 'object',
      additionalProperties: false,
      required: ['interval_days'],
      properties: {
        interval_days: {
          type: 'integer',
          minimum: 0,
          maximum: MAX_INTERVAL_DAYS,
          description: 'Jours entre deux brumisations, 0 si elle n’en a pas besoin',
        },
      },
    },
    repotting: intervalObject('Jours entre deux rempotages'),
    tips: {
      type: 'array',
      minItems: MIN_TIPS,
      maxItems: MAX_TIPS,
      items: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
} as const;

/** Trimmed, single spaces: the form used to store and look up species names. */
export function speciesKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Checks a parsed model answer and returns the typed sheet, or what is wrong with it. */
export function validateCareSheet(value: unknown): Validation<CareSheet> {
  const r = new JsonReader();
  const root = r.object(value, 'réponse');
  const watering = r.object(root.watering, 'watering');
  const temperature = r.object(root.temperature, 'temperature');
  const toxicity = r.object(root.toxicity, 'toxicity');

  const errorsBefore = r.errors.length;
  const minC = r.integer(temperature.min_c, 'temperature.min_c', -30, 30);
  const maxC = r.integer(temperature.max_c, 'temperature.max_c', 0, 50);
  if (r.errors.length === errorsBefore && minC >= maxC) {
    r.fail('temperature', 'min_c doit être inférieur à max_c', temperature);
  }

  // No misting: null, left out, or an interval of 0.
  let misting: CareSheet['misting'] = null;
  if (root.misting !== null && root.misting !== undefined && root.misting !== false) {
    const days = r.object(root.misting, 'misting').interval_days;
    if (days !== null && days !== 0 && days !== undefined) {
      misting = { interval_days: r.integer(days, 'misting.interval_days', 1, MAX_INTERVAL_DAYS) };
    }
  }

  // Extra tips are dropped rather than sent back: not worth another run.
  const tips = r
    .array(root.tips, 'tips')
    .filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0)
    .map((tip) => tip.trim().replace(/\s+/g, ' ').slice(0, 200))
    .slice(0, MAX_TIPS);
  if (Array.isArray(root.tips) && tips.length < MIN_TIPS) {
    r.fail('tips', `entre ${MIN_TIPS} et ${MAX_TIPS} conseils attendus`, root.tips);
  }

  return r.result<CareSheet>({
    common_name: r.string(root.common_name, 'common_name', 80),
    scientific_name: speciesKey(r.string(root.scientific_name, 'scientific_name', 80)),
    light: r.oneOf(root.light, 'light', LIGHT_ORDER, LIGHT_ALIASES),
    watering: {
      interval_days: r.integer(watering.interval_days, 'watering.interval_days', 1, MAX_INTERVAL_DAYS),
      winter_factor: r.number(watering.winter_factor, 'watering.winter_factor', 1, 3),
      advice: r.string(watering.advice, 'watering.advice'),
    },
    humidity: r.oneOf(root.humidity, 'humidity', HUMIDITY_VALUES, HUMIDITY_ALIASES),
    temperature: { min_c: minC, max_c: maxC },
    toxicity: {
      cats: r.oneOf(toxicity.cats, 'toxicity.cats', TOXICITY_VALUES, TOXICITY_ALIASES),
      dogs: r.oneOf(toxicity.dogs, 'toxicity.dogs', TOXICITY_VALUES, TOXICITY_ALIASES),
    },
    fertilizing: {
      interval_days: r.integer(
        r.object(root.fertilizing, 'fertilizing').interval_days,
        'fertilizing.interval_days',
        1,
        MAX_INTERVAL_DAYS,
      ),
    },
    misting,
    repotting: {
      interval_days: r.integer(
        r.object(root.repotting, 'repotting').interval_days,
        'repotting.interval_days',
        1,
        MAX_INTERVAL_DAYS,
      ),
    },
    tips,
  });
}

function nearestWinterFactor(factor: number): number {
  return WINTER_FACTORS.reduce((best, f) => (Math.abs(f - factor) < Math.abs(best - factor) ? f : best));
}

const clampInterval = (days: number) => Math.min(Math.max(Math.round(days), 1), MAX_INTERVAL_DAYS);

/**
 * The care tasks a sheet suggests for a new plant. Watering and misting start
 * today; the first feed and the repotting come after one interval (a new
 * plant usually has fresh soil).
 */
export function careSheetTasks(sheet: CareSheet, from = today()): TaskInput[] {
  const task = (kind: TaskInput['kind'], days: number, winterFactor: number, startNow: boolean): TaskInput => {
    const intervalDays = clampInterval(days);
    return {
      kind,
      label: null,
      interval_days: intervalDays,
      winter_factor: winterFactor,
      next_due_on: startNow ? from : addDays(from, effectiveInterval(intervalDays, winterFactor, from)),
    };
  };
  return [
    task('water', sheet.watering.interval_days, nearestWinterFactor(sheet.watering.winter_factor), true),
    task('fertilize', sheet.fertilizing.interval_days, TASK_KINDS.fertilize.defaultWinterFactor, false),
    ...(sheet.misting
      ? [task('mist', sheet.misting.interval_days, TASK_KINDS.mist.defaultWinterFactor, true)]
      : []),
    task('repot', sheet.repotting.interval_days, TASK_KINDS.repot.defaultWinterFactor, false),
  ];
}

// Wording

export const HUMIDITY_LABELS: Record<Humidity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Forte',
};

/** "Toxique pour les chats et les chiens", "Sans danger pour les chiens, toxique pour les chats"… */
export function toxicityText({ cats, dogs }: CareSheet['toxicity']): string {
  const word: Record<Toxicity, string> = {
    toxic: 'toxique',
    non_toxic: 'sans danger',
    unknown: 'toxicité inconnue',
  };
  const text =
    cats === dogs
      ? `${word[cats]} pour les chats et les chiens`
      : `${word[cats]} pour les chats, ${word[dogs]} pour les chiens`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Like `formatInterval`, in months or years for long intervals: "tous les 2 ans". */
export function formatCareInterval(days: number): string {
  if (days >= 330) {
    const years = Math.round(days / 365);
    return years <= 1 ? 'tous les ans' : `tous les ${years} ans`;
  }
  if (days >= 45) {
    const months = Math.round(days / 30);
    return `tous les ${months} mois`;
  }
  return formatInterval(days);
}

/** "×1,5 en hiver", or null when the rhythm stays the same all year. */
export function winterText(factor: number): string | null {
  return factor === 1 ? null : `×${String(factor).replace('.', ',')} en hiver`;
}
