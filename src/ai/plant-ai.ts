/**
 * What the scan asks the on-device model: which species a photo shows, and
 * how to care for a species. Answers are raw text from a small model, so they
 * are parsed leniently, validated, and asked again with the errors when they
 * do not fit.
 */

import { ai, type GenerateRequest } from '@/ai';
import { CARE_SHEET_SCHEMA, speciesKey, validateCareSheet, type CareSheet } from '@/lib/care-sheet';
import {
  IDENTIFICATION_SCHEMA,
  MAX_CANDIDATES,
  validateIdentification,
  type Identification,
} from '@/lib/identification';
import type { Validation } from '@/lib/validate';

/**
 * Extra runs after an answer that does not fit, with the problems sent back.
 *
 * Requests leave `temperature` to the engine: changing it reloads the model.
 * Runs are never started in parallel, nor retried after a cancellation: the
 * engine finishes a cancelled run natively before starting the next one.
 */
export const MAX_RETRIES = 2;

type Options = { signal?: AbortSignal };

/** A species to write a sheet for. */
export type SpeciesQuery = {
  /** The confirmed scientific name, or whatever the user typed when `commonName` is null. */
  scientificName: string;
  commonName: string | null;
};

/** The model kept answering off the format. The message is for the user. */
export class PlantAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlantAiError';
  }
}

function abortError() {
  const error = new Error('Annulé.');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

// The first run after launch also loads the model into memory, which is slow.
let warm = false;

/** Whether the model has answered since the app started (so it is loaded). */
export function modelIsWarm(): boolean {
  return warm;
}

// JSON extraction

/** Index of the brace closing the object that opens at `start`, or -1. Braces in strings don't count. */
function closingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Drops commas right before } or ], outside strings: `{"a": 1,}` → `{"a": 1}`. */
function withoutTrailingCommas(json: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === ',') {
      let next = i + 1;
      while (next < json.length && /\s/.test(json[next])) next++;
      if (json[next] === '}' || json[next] === ']') continue;
    }
    out += char;
  }
  return out;
}

/**
 * The first JSON object in a model answer. Code fences and text around it are
 * ignored, trailing commas forgiven. Throws a short French message otherwise,
 * which is sent back to the model.
 */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/```[a-z]*/gi, '');
  const start = unfenced.indexOf('{');
  if (start === -1) throw new Error('aucun objet JSON dans la réponse');
  const end = closingBrace(unfenced, start);
  if (end === -1) throw new Error('objet JSON incomplet : il manque une accolade fermante');
  const json = unfenced.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch {
    try {
      return JSON.parse(withoutTrailingCommas(json));
    } catch (error) {
      throw new Error(`JSON invalide (${error instanceof Error ? error.message : 'erreur de syntaxe'})`);
    }
  }
}

// Asking with retries

function correctionPrompt(prompt: string, answer: string, errors: string[]): string {
  return [
    prompt,
    '',
    'Ta réponse précédente ne convient pas :',
    answer.trim().slice(0, 1500),
    '',
    'Problèmes :',
    ...errors.slice(0, 10).map((error) => `- ${error}`),
    '',
    'Corrige ces problèmes et réponds uniquement avec l’objet JSON demandé, sans texte autour.',
  ].join('\n');
}

/** Runs the model until its answer passes `validate`, at most 1 + MAX_RETRIES times. */
async function generateValid<T>(
  request: GenerateRequest,
  validate: (value: unknown) => Validation<T>,
  failure: string,
): Promise<T> {
  const { signal } = request;
  let prompt = request.prompt;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    throwIfAborted(signal);
    let answer: string;
    try {
      answer = await ai.generate({ ...request, prompt });
      warm = true;
    } catch (error) {
      // The engine may reject its own way when cancelled.
      throwIfAborted(signal);
      throw error;
    }
    throwIfAborted(signal);

    let errors: string[];
    try {
      const result = validate(extractJson(answer));
      if (result.ok) return result.value;
      errors = result.errors;
    } catch (error) {
      errors = [error instanceof Error ? error.message : String(error)];
    }
    prompt = correctionPrompt(request.prompt, answer, errors);
  }
  throw new PlantAiError(failure);
}

// Identification

const IDENTIFY_SYSTEM =
  'Tu es botaniste. Tu identifies les plantes d’intérieur, de balcon et de jardin à partir d’une photo. ' +
  'Tu réponds uniquement avec un objet JSON valide, sans texte autour.';

const IDENTIFY_PROMPT = [
  'Quelle plante voit-on sur cette photo ?',
  `Donne jusqu’à ${MAX_CANDIDATES} espèces possibles, de la plus probable à la moins probable, avec pour chacune :`,
  '- scientific_name : le genre et l’espèce en latin (par exemple « Monstera deliciosa ») ;',
  '- common_name : son nom commun en français ;',
  '- confidence : ta confiance, entre 0 et 1.',
  'Si tu hésites, baisse la confiance plutôt que d’inventer.',
  'Dans photo, note seulement ce que tu vois vraiment :',
  '- pot.material : terracotta (terre cuite), plastic (plastique), ceramic (céramique), other (autre matière), none (plantée en pleine terre) ou unknown (pot caché ou hors de la photo) ;',
  '- pot.diameter_cm : diamètre du haut du pot en cm, estimé d’après la taille des feuilles, ou 0 si tu ne peux pas l’estimer ;',
  '- repot.needed : yes si des racines sortent du pot ou couvrent la terre, ou si la plante est bien trop grande pour son pot ; no si le pot lui va ; unknown si la photo ne permet pas de le dire ;',
  '- repot.reason : ce qui te le fait dire, en quelques mots, ou "" ;',
  '- observations : jusqu’à 3 constats utiles pour son entretien, en quelques mots chacun (feuilles jaunies, taches, tiges étirées…), ou une liste vide si elle a l’air en forme.',
  'Si la photo ne montre pas de plante, mets is_plant à false et une liste vide.',
  'Réponds uniquement avec un objet JSON de cette forme :',
  '{"is_plant": true, "candidates": [{"scientific_name": "…", "common_name": "…", "confidence": 0.6}], "photo": {"pot": {"material": "…", "diameter_cm": 0}, "repot": {"needed": "…", "reason": "…"}, "observations": ["…"]}}',
].join('\n');

/**
 * Asks the model which species the photo shows, and what it sees of the pot
 * and the plant's state. Only the species can make it ask again: the rest
 * reads as unknown when garbled. Rejects with a French message, or an
 * AbortError.
 */
export function identifyPlant(photoUri: string, { signal }: Options = {}): Promise<Identification> {
  return generateValid(
    {
      system: IDENTIFY_SYSTEM,
      prompt: IDENTIFY_PROMPT,
      imageUri: photoUri,
      jsonSchema: IDENTIFICATION_SCHEMA,
      // About 200 tokens expected; the schema caps the answer near 400.
      maxTokens: 600,
      signal,
    },
    validateIdentification,
    'Le modèle n’a pas réussi à analyser cette photo. Réessaie, ou saisis l’espèce à la main.',
  );
}

// Care sheet

const SHEET_SYSTEM =
  'Tu es un jardinier expérimenté qui conseille des particuliers en France. ' +
  'Tu écris en français, en tutoyant, avec des phrases courtes. ' +
  'Tu réponds uniquement avec un objet JSON valide, sans texte autour.';

function sheetPrompt({ scientificName, commonName }: SpeciesQuery): string {
  const species = commonName
    ? `la plante « ${scientificName} » (nom commun : ${commonName})`
    : `la plante « ${scientificName} » (nom donné par l’utilisateur : trouve son nom scientifique et son nom commun en français)`;
  return [
    `Rédige la fiche d’entretien de ${species}, cultivée en pot à la maison.`,
    'Champs :',
    '- common_name : nom commun en français ; scientific_name : genre et espèce en latin ;',
    '- light : full_sun (plein soleil), bright_indirect (lumineux sans soleil direct), partial_shade (mi-ombre) ou shade (ombre) ;',
    '- watering : interval_days, jours entre deux arrosages au printemps et en été ; winter_factor, entre 1 et 3, combien de fois plus espacés de novembre à février ; advice, un conseil d’arrosage en une phrase ;',
    '- humidity : humidité de l’air qu’elle aime, low, medium ou high ;',
    '- temperature : min_c et max_c, températures supportées en °C ;',
    '- toxicity : cats et dogs, chacun toxic, non_toxic ou unknown ;',
    '- fertilizing : interval_days, jours entre deux apports d’engrais au printemps et en été ;',
    '- misting : interval_days, jours entre deux brumisations, ou 0 si elle n’a pas besoin d’être brumisée ;',
    '- repotting : interval_days, jours entre deux rempotages (en général 365 à 730) ; advice, quand et comment la rempoter, en une phrase ;',
    '- substrate : le terreau qui lui convient, en une phrase courte ;',
    '- pot : le pot qui lui convient (matière, drainage), en une phrase courte ;',
    '- propagation : comment la multiplier (bouture, division…), en une phrase, ou "" si c’est difficile à la maison ;',
    '- problems : 1 à 3 problèmes fréquents, chacun avec symptom (ce qu’on voit), cause et fix (que faire), en quelques mots ;',
    '- tips : 2 à 4 conseils courts, sans répéter les champs précédents.',
    'Les intervalles sont des nombres entiers de jours, entre 1 et 730.',
    'Réponds uniquement avec un objet JSON de cette forme (valeurs d’exemple, à adapter à la plante) :',
    '{"common_name": "…", "scientific_name": "…", "light": "bright_indirect", "watering": {"interval_days": 7, "winter_factor": 1.5, "advice": "…"}, "humidity": "medium", "temperature": {"min_c": 15, "max_c": 28}, "toxicity": {"cats": "unknown", "dogs": "unknown"}, "fertilizing": {"interval_days": 14}, "misting": {"interval_days": 0}, "repotting": {"interval_days": 730, "advice": "…"}, "substrate": "…", "pot": "…", "propagation": "…", "problems": [{"symptom": "…", "cause": "…", "fix": "…"}], "tips": ["…", "…"]}',
  ].join('\n');
}

/**
 * Asks the model for the care sheet of a species. A confirmed species keeps
 * its names, whatever spelling the model used. Rejects with a French message,
 * or an AbortError.
 */
export async function generateCareSheet(species: SpeciesQuery, { signal }: Options = {}): Promise<CareSheet> {
  const sheet = await generateValid(
    {
      system: SHEET_SYSTEM,
      prompt: sheetPrompt(species),
      jsonSchema: CARE_SHEET_SCHEMA,
      // About 500 tokens expected; the schema caps the answer near 1000.
      maxTokens: 1400,
      signal,
    },
    // A new sheet must have every field, unlike the older ones read back from the database.
    (value) => validateCareSheet(value, { strict: true }),
    'Le modèle n’a pas réussi à rédiger la fiche d’entretien. Réessaie dans un moment.',
  );
  if (!species.commonName) return sheet;
  return { ...sheet, scientific_name: speciesKey(species.scientificName), common_name: species.commonName.trim() };
}
