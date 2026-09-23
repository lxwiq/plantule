/**
 * A health check read from a close-up photo by the on-device model: how the
 * plant looks, up to three likely problems, and whether its watering or light
 * should change. Leads to check, never a verdict: the model sees neither the
 * roots nor pests too small for the photo.
 */

import { MAX_INTERVAL_DAYS } from './schedule';
import { enumKey, JsonReader, looseText, type Validation } from './validate';

export type DiagnosisStatus = 'healthy' | 'watch' | 'treat';
export type ProblemKind = 'disease' | 'pest' | 'care' | 'environment';
export type WateringChange = 'less' | 'more' | 'none';
export type LightChange = 'more' | 'less' | 'none';

export type DiagnosisProblem = {
  /** In French, e.g. "Excès d’arrosage". */
  name: string;
  kind: ProblemKind;
  /** From 0 to 1, as estimated by the model: a hint, not a probability. */
  confidence: number;
  /** What in the photo or the plant's history points to it, in a sentence. */
  signs: string;
  /** What to do now, short sentences, most urgent first. */
  actions: string[];
};

export type Diagnosis = {
  status: DiagnosisStatus;
  /** One or two French sentences. */
  summary: string;
  /** Most likely first, at most `MAX_PROBLEMS`. Empty when it looks healthy. */
  problems: DiagnosisProblem[];
  watering_change: WateringChange;
  light_change: LightChange;
};

export const MAX_PROBLEMS = 3;

export const STATUS_LABELS: Record<DiagnosisStatus, string> = {
  healthy: 'Saine',
  watch: 'À surveiller',
  treat: 'À soigner',
};

export const PROBLEM_KIND_LABELS: Record<ProblemKind, string> = {
  disease: 'Maladie',
  pest: 'Parasite',
  care: 'Entretien',
  environment: 'Environnement',
};

const STATUSES: readonly DiagnosisStatus[] = ['healthy', 'watch', 'treat'];
const KINDS: readonly ProblemKind[] = ['disease', 'pest', 'care', 'environment'];
const WATERING_CHANGES: readonly WateringChange[] = ['less', 'more', 'none'];
const LIGHT_CHANGES: readonly LightChange[] = ['more', 'less', 'none'];
const MAX_ACTIONS = 3;
/** Longest texts the schema lets the model write. */
const NAME_LENGTH = 60;
const SUMMARY_LENGTH = 240;
const SIGNS_LENGTH = 160;
const ACTION_LENGTH = 120;
/** Without the schema (when the engine rejects it), longer texts are cut at a word, a little further. */
const CUT_SLACK = 40;

/** Synonyms a small model tends to write instead of the enum values. */
const STATUS_ALIASES: Record<string, DiagnosisStatus> = {
  saine: 'healthy',
  sain: 'healthy',
  ok: 'healthy',
  good: 'healthy',
  en_forme: 'healthy',
  à_surveiller: 'watch',
  a_surveiller: 'watch',
  surveiller: 'watch',
  monitor: 'watch',
  à_soigner: 'treat',
  a_soigner: 'treat',
  soigner: 'treat',
  sick: 'treat',
  unhealthy: 'treat',
};
const KIND_ALIASES: Record<string, ProblemKind> = {
  maladie: 'disease',
  fungus: 'disease',
  fungal: 'disease',
  champignon: 'disease',
  parasite: 'pest',
  pests: 'pest',
  insect: 'pest',
  insecte: 'pest',
  ravageur: 'pest',
  entretien: 'care',
  watering: 'care',
  arrosage: 'care',
  environnement: 'environment',
  light: 'environment',
  lumière: 'environment',
};
const CHANGE_ALIASES: Record<string, 'less' | 'more' | 'none'> = {
  moins: 'less',
  reduce: 'less',
  decrease: 'less',
  plus: 'more',
  increase: 'more',
  aucun: 'none',
  aucune: 'none',
  rien: 'none',
  no: 'none',
  non: 'none',
  same: 'none',
  pareil: 'none',
};

/** Passed to the engine, which can constrain its output to it. The problems come first: the model looks before it judges. */
export const DIAGNOSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['problems', 'status', 'summary', 'watering_change', 'light_change'],
  properties: {
    problems: {
      type: 'array',
      maxItems: MAX_PROBLEMS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'kind', 'confidence', 'signs', 'actions'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: NAME_LENGTH, description: 'Le problème en quelques mots' },
          kind: { type: 'string', enum: KINDS },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          signs: { type: 'string', minLength: 1, maxLength: SIGNS_LENGTH, description: 'Ce qui le fait penser' },
          actions: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_ACTIONS,
            items: { type: 'string', minLength: 1, maxLength: ACTION_LENGTH },
          },
        },
      },
    },
    status: { type: 'string', enum: STATUSES },
    summary: { type: 'string', minLength: 1, maxLength: SUMMARY_LENGTH },
    watering_change: { type: 'string', enum: WATERING_CHANGES },
    light_change: { type: 'string', enum: LIGHT_CHANGES },
  },
} as const;

export type DiagnosisValidationOptions = {
  /** For an answer the model just wrote: problems must be complete and are sent back otherwise. */
  strict?: boolean;
};

/** One of `values` or a known synonym, or null. Never records an error. */
function pick<T extends string>(value: unknown, values: readonly T[], aliases: Record<string, T>): T | null {
  if (typeof value !== 'string') return null;
  const key = enumKey(value);
  return values.find((v) => v === key) ?? aliases[key] ?? null;
}

/** A confidence from 0 to 1; a percentage (85) or "0,6" is forgiven. Null when unreadable. */
function readConfidence(value: unknown): number | null {
  const number = typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 100) return null;
  return number > 1 ? number / 100 : number;
}

/** Non-empty, distinct actions, at most `MAX_ACTIONS`. A single string counts as one. */
function readActions(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  const actions: string[] = [];
  for (const item of items) {
    const text = looseText(item, ACTION_LENGTH + CUT_SLACK);
    if (text && !actions.some((a) => a.toLowerCase() === text.toLowerCase())) actions.push(text);
    if (actions.length === MAX_ACTIONS) break;
  }
  return actions;
}

/**
 * Checks a parsed model answer (or a stored diagnosis) and returns the typed
 * diagnosis, or what is wrong. Strict, a problem missing its name, kind,
 * confidence, signs or actions is sent back, and so is "treat" without a
 * problem. Otherwise such problems are dropped and unreadable values fall
 * back to "watch", "" and "none", so a stored diagnosis always reads back.
 */
export function validateDiagnosis(
  value: unknown,
  { strict = false }: DiagnosisValidationOptions = {},
): Validation<Diagnosis> {
  const r = new JsonReader();
  const root = r.object(value, 'réponse');

  const problems: DiagnosisProblem[] = [];
  const items = Array.isArray(root.problems) ? root.problems : [];
  if (strict && !Array.isArray(root.problems)) r.fail('problems', 'liste attendue, vide si elle est saine', root.problems);
  items.forEach((item, index) => {
    const path = `problems[${index}]`;
    const raw = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    const problem = {
      name: looseText(raw.name, NAME_LENGTH + CUT_SLACK),
      kind: pick(raw.kind, KINDS, KIND_ALIASES),
      confidence: readConfidence(raw.confidence),
      signs: looseText(raw.signs, SIGNS_LENGTH + CUT_SLACK),
      actions: readActions(raw.actions),
    };
    if (strict) {
      if (!problem.name) r.fail(`${path}.name`, 'texte non vide attendu', raw.name);
      if (!problem.kind) r.fail(`${path}.kind`, `une valeur parmi ${KINDS.join(', ')} attendue`, raw.kind);
      if (problem.confidence === null) r.fail(`${path}.confidence`, 'nombre entre 0 et 1 attendu', raw.confidence);
      if (!problem.signs) r.fail(`${path}.signs`, 'texte non vide attendu', raw.signs);
      if (problem.actions.length === 0) {
        r.fail(`${path}.actions`, `entre 1 et ${MAX_ACTIONS} actions attendues`, raw.actions);
      }
    }
    // Leniently, a problem needs at least a name to be worth showing.
    if (!problem.name) return;
    problems.push({
      name: problem.name,
      kind: problem.kind ?? 'care',
      confidence: problem.confidence ?? 0.5,
      signs: problem.signs,
      actions: problem.actions,
    });
  });
  // Most likely first; extra problems are dropped rather than sent back.
  problems.sort((a, b) => b.confidence - a.confidence);
  problems.splice(MAX_PROBLEMS);

  const status = pick(root.status, STATUSES, STATUS_ALIASES);
  const summary = looseText(root.summary, SUMMARY_LENGTH + CUT_SLACK);
  const wateringChange = pick(root.watering_change, WATERING_CHANGES, CHANGE_ALIASES);
  const lightChange = pick(root.light_change, LIGHT_CHANGES, CHANGE_ALIASES);
  if (strict) {
    if (!status) r.fail('status', `une valeur parmi ${STATUSES.join(', ')} attendue`, root.status);
    if (status === 'treat' && problems.length === 0) {
      r.fail('problems', 'au moins un problème attendu quand status vaut treat', root.problems);
    }
    if (!summary) r.fail('summary', 'texte non vide attendu', root.summary);
    if (!wateringChange) {
      r.fail('watering_change', `une valeur parmi ${WATERING_CHANGES.join(', ')} attendue`, root.watering_change);
    }
    if (!lightChange) r.fail('light_change', `une valeur parmi ${LIGHT_CHANGES.join(', ')} attendue`, root.light_change);
  }

  return r.result<Diagnosis>({
    status: status ?? 'watch',
    summary,
    problems,
    watering_change: wateringChange ?? 'none',
    light_change: lightChange ?? 'none',
  });
}

/** Multipliers of the watering interval after a diagnosis. */
const WATERING_FACTORS: Record<Exclude<WateringChange, 'none'>, number> = { less: 1.3, more: 0.75 };

/**
 * The watering interval to offer after a diagnosis, or null when it should
 * not change: about ×1.3 for less water, ×0.75 for more, within 1 to 730 days.
 * Always at least a day apart from the current interval.
 */
export function suggestedWateringInterval(intervalDays: number, change: WateringChange): number | null {
  if (change === 'none' || !Number.isFinite(intervalDays)) return null;
  const current = Math.min(Math.max(Math.round(intervalDays), 1), MAX_INTERVAL_DAYS);
  const scaled = Math.round(current * WATERING_FACTORS[change]);
  const days = change === 'less' ? Math.max(scaled, current + 1) : Math.min(scaled, current - 1);
  const bounded = Math.min(Math.max(days, 1), MAX_INTERVAL_DAYS);
  return bounded === current ? null : bounded;
}
