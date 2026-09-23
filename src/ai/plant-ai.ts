/**
 * What the app asks the on-device model: which species a photo shows, how to
 * care for a species, what ails a plant, and questions about it. JSON answers
 * are raw text from a small model, so they are parsed leniently, validated,
 * and asked again with the errors when they do not fit.
 */

import { ai, type GenerateRequest } from '@/ai';
import type { ChatRole } from '@/db/types';
import {
  CARE_SHEET_SCHEMA,
  referenceSheet,
  SHEET_TEXTS_SCHEMA,
  speciesKey,
  validateCareSheet,
  validateSheetTexts,
  type CareSheet,
} from '@/lib/care-sheet';
import { DIAGNOSIS_SCHEMA, MAX_PROBLEMS, validateDiagnosis, type Diagnosis } from '@/lib/diagnosis';
import {
  IDENTIFICATION_SCHEMA,
  MAX_CANDIDATES,
  validateIdentification,
  type Identification,
} from '@/lib/identification';
import { findReference, referenceFacts, type ReferencePlant } from '@/lib/plant-reference';
import type { Validation } from '@/lib/validate';

import { buildPlantContext, contextText, EXPERT_SYSTEM, shorten } from './plant-context';

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

/** The expert's instructions, for a task that answers in JSON. */
const JSON_SYSTEM = `${EXPERT_SYSTEM} Tu réponds uniquement avec un objet JSON valide, sans texte autour.`;

// Identification

const IDENTIFY_PROMPT = [
  'Quelle plante voit-on sur cette photo ? Elle peut être d’intérieur, de balcon ou de jardin.',
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
 * and the plant's state. Candidates found in the reference base are linked
 * to it and named after it. Only the species can make it ask again: the rest
 * reads as unknown when garbled. Rejects with a French message, or an
 * AbortError.
 */
export function identifyPlant(photoUri: string, { signal }: Options = {}): Promise<Identification> {
  return generateValid(
    {
      system: JSON_SYSTEM,
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

/** For a species of the reference base: its figures are given, the model writes the texts only. */
function sheetTextsPrompt(plant: ReferencePlant, commonName: string | null): string {
  const name = commonName?.trim() || plant.common_names[0];
  return [
    `Rédige les conseils d’entretien de la plante « ${plant.scientific_name} » (${name}), cultivée en pot en France.`,
    referenceFacts(plant),
    'Ces chiffres sont vérifiés : ne les contredis pas, et n’écris pas d’autres chiffres d’arrosage, d’engrais, de température ou de rempotage.',
    'Champs :',
    '- watering_advice : comment l’arroser, en une phrase, sans nombre de jours ;',
    '- repotting_advice : quand et comment la rempoter, en une phrase ;',
    '- substrate : le terreau qui lui convient, en une phrase courte ;',
    '- pot : le pot qui lui convient (matière, drainage), en une phrase courte ;',
    '- propagation : comment la multiplier (bouture, division…), en une phrase, ou "" si c’est difficile à la maison ;',
    '- problems : 1 à 3 problèmes fréquents, chacun avec symptom (ce qu’on voit), cause et fix (que faire), en quelques mots ;',
    '- tips : 2 à 4 conseils courts, sans répéter les champs précédents ni les chiffres.',
    'Réponds uniquement avec un objet JSON de cette forme :',
    '{"watering_advice": "…", "repotting_advice": "…", "substrate": "…", "pot": "…", "propagation": "…", "problems": [{"symptom": "…", "cause": "…", "fix": "…"}], "tips": ["…", "…"]}',
  ].join('\n');
}

const SHEET_FAILURE = 'Le modèle n’a pas réussi à rédiger la fiche d’entretien. Réessaie dans un moment.';

/**
 * Asks the model for the care sheet of a species. For a species of the
 * reference base, the figures come from the base and the model only writes
 * the texts (`reference_id` is set); otherwise it writes the whole sheet. A
 * confirmed species keeps its common name, whatever spelling the model used.
 * Rejects with a French message, or an AbortError.
 */
export async function generateCareSheet(species: SpeciesQuery, { signal }: Options = {}): Promise<CareSheet> {
  const reference = findReference(species.scientificName);
  if (reference) {
    const texts = await generateValid(
      {
        system: JSON_SYSTEM,
        prompt: sheetTextsPrompt(reference, species.commonName),
        jsonSchema: SHEET_TEXTS_SCHEMA,
        // About 350 tokens expected; the schema caps the answer near 800.
        maxTokens: 1000,
        signal,
      },
      validateSheetTexts,
      SHEET_FAILURE,
    );
    return referenceSheet(reference, texts, species.commonName);
  }

  const sheet = await generateValid(
    {
      system: JSON_SYSTEM,
      prompt: sheetPrompt(species),
      jsonSchema: CARE_SHEET_SCHEMA,
      // About 500 tokens expected; the schema caps the answer near 1000.
      maxTokens: 1400,
      signal,
    },
    // A new sheet must have every field, unlike the older ones read back from the database.
    (value) => validateCareSheet(value, { strict: true }),
    SHEET_FAILURE,
  );
  const written = { ...sheet, reference_id: null };
  if (!species.commonName) return written;
  return { ...written, scientific_name: speciesKey(species.scientificName), common_name: species.commonName.trim() };
}

// Diagnosis

function diagnosisPrompt(context: string): string {
  return [
    'Ce que l’app sait de la plante :',
    context,
    '',
    'La photo montre de près ce qui inquiète : feuilles, tiges, dessous des feuilles ou terreau. Qu’est-ce qui ne va pas ?',
    `Donne jusqu’à ${MAX_PROBLEMS} problèmes probables, du plus probable au moins probable, avec pour chacun :`,
    '- name : le problème en quelques mots (par exemple « Excès d’arrosage », « Cochenilles », « Coup de soleil ») ;',
    '- kind : disease (maladie, champignon), pest (parasite), care (erreur d’entretien : arrosage, engrais, pot) ou environment (lumière, température, air sec, courant d’air) ;',
    '- confidence : ta confiance, entre 0 et 1 ;',
    '- signs : ce qui te le fait penser, sur la photo ou dans l’historique, en une phrase ;',
    '- actions : 1 à 3 choses à faire maintenant, en phrases courtes, la plus urgente d’abord.',
    'Trop d’eau ou pas assez ? Compare avec les derniers arrosages et les « terreau encore humide » : un terreau souvent encore humide, des feuilles jaunes et molles, une base de tige noire ou molle font plutôt penser à trop d’eau ; des feuilles sèches, cassantes ou recroquevillées et un arrosage en retard, plutôt à pas assez. Si l’historique ne permet pas de trancher, dis-le et baisse la confiance.',
    'Tu ne vois ni les racines ni les parasites trop petits : propose de vérifier (dessous des feuilles, racines, terreau) plutôt que d’affirmer.',
    'Puis :',
    '- status : healthy (saine), watch (à surveiller) ou treat (à soigner) ;',
    '- summary : ton avis en une ou deux phrases ;',
    '- watering_change : less (arroser moins souvent), more (plus souvent) ou none (ne rien changer) ;',
    '- light_change : more (plus de lumière), less (moins de lumière) ou none.',
    'Si elle a l’air en forme, mets healthy et une liste vide. Si la photo ne montre pas de plante ou ne permet pas de juger, mets watch, une liste vide, et demande dans summary une photo nette, de près, à la lumière du jour.',
    'Réponds uniquement avec un objet JSON de cette forme :',
    '{"problems": [{"name": "…", "kind": "care", "confidence": 0.6, "signs": "…", "actions": ["…"]}], "status": "watch", "summary": "…", "watering_change": "none", "light_change": "none"}',
  ].join('\n');
}

/**
 * Asks the model what ails the plant on a close-up photo, with what the app
 * knows of it (species, sheet, recent watering, room, season) in the same
 * run. Asked again until every problem is complete, like a sheet. Rejects
 * with a French message, or an AbortError.
 */
export async function diagnosePlant(
  photoUri: string,
  plantId: string,
  { signal }: Options = {},
): Promise<Diagnosis> {
  throwIfAborted(signal);
  const context = buildPlantContext(plantId);
  if (!context) throw new PlantAiError('Cette plante n’existe plus.');
  return generateValid(
    {
      system: JSON_SYSTEM,
      prompt: diagnosisPrompt(contextText(context)),
      imageUri: photoUri,
      jsonSchema: DIAGNOSIS_SCHEMA,
      // About 300 tokens expected; the schema caps the answer near 700.
      maxTokens: 900,
      signal,
    },
    (value) => validateDiagnosis(value, { strict: true }),
    'Le modèle n’a pas réussi à analyser cette photo. Réessaie avec une photo nette, prise de près à la lumière du jour.',
  );
}

// Questions

/** A message of the conversation, as given back to the model. */
export type ChatTurn = { role: ChatRole; text: string };

/** Messages of the conversation given back to the model with a question. */
export const MAX_HISTORY_TURNS = 6;
/** Each one is cut to this length, so that the context, the conversation and the answer fit. */
export const MAX_TURN_LENGTH = 400;
const MAX_QUESTION_LENGTH = 500;

/**
 * The last turns of the conversation, shortened, as given to the model. A
 * last user turn repeating the question (already saved by the screen) is
 * left out, and so are empty ones.
 */
export function historyForPrompt(history: ChatTurn[], question: string): ChatTurn[] {
  const turns = history.filter((turn) => turn.text.trim());
  const last = turns.at(-1);
  if (last?.role === 'user' && last.text.trim() === question.trim()) turns.pop();
  return turns
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, text: shorten(turn.text, MAX_TURN_LENGTH) }));
}

function askPrompt(context: string, history: ChatTurn[], question: string): string {
  const lines = ['Ce que l’app sait de la plante :', context, ''];
  if (history.length > 0) {
    lines.push(
      'Conversation jusqu’ici :',
      ...history.map((turn) => `${turn.role === 'user' ? 'Utilisateur' : 'Plantule'} : ${turn.text}`),
      '',
    );
  }
  lines.push(
    `Question : ${question}`,
    '',
    'Réponds à cette question en 2 à 5 phrases courtes, en texte simple : pas de titre, pas de liste, pas de gras.',
    'Appuie-toi sur ce que l’app sait de la plante (ses soins, sa pièce, la saison) quand ça aide.',
    'Si tu ne sais pas, ou si la question ne concerne pas les plantes, dis-le simplement.',
  );
  return lines.join('\n');
}

/** An answer as shown: without markdown marks nor a "Plantule :" in front. */
export function cleanAnswer(text: string): string {
  return text
    .replace(/\*\*|__/g, '')
    .replace(/^\s*#+\s*/gm, '')
    .replace(/^\s*(plantule|réponse|assistant)\s*:\s*/i, '')
    .trim();
}

/**
 * Answers a question about a plant, in short free text, knowing the plant and
 * the last messages of the conversation (`history`, oldest first, without the
 * question). `onText` gets the answer so far as it is written. Resolves with
 * the whole answer; rejects with a French message, or an AbortError. Never
 * retried: a free-text answer has no format to check.
 */
export async function askPlant(
  plantId: string,
  history: ChatTurn[],
  question: string,
  { signal, onText }: Options & { onText?: (text: string) => void } = {},
): Promise<string> {
  throwIfAborted(signal);
  const asked = shorten(question, MAX_QUESTION_LENGTH);
  if (!asked) throw new PlantAiError('Écris ta question.');
  const context = buildPlantContext(plantId);
  if (!context) throw new PlantAiError('Cette plante n’existe plus.');

  let answer: string;
  try {
    answer = await ai.generate({
      // Plain text: the JSON instruction is left out.
      system: EXPERT_SYSTEM,
      prompt: askPrompt(contextText(context), historyForPrompt(history, question), asked),
      // A few sentences, with room for a longer one.
      maxTokens: 400,
      signal,
      onText: onText && ((text) => onText(cleanAnswer(text))),
    });
    warm = true;
  } catch (error) {
    // The engine may reject its own way when cancelled.
    throwIfAborted(signal);
    throw error;
  }
  throwIfAborted(signal);
  const text = cleanAnswer(answer);
  if (!text) throw new PlantAiError('Le modèle n’a pas su répondre. Reformule ta question.');
  return text;
}
