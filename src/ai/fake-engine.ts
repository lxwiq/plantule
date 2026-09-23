/**
 * A pretend model for development (browser, Expo Go), turned on with
 * EXPO_PUBLIC_FAKE_AI=1. It answers like the real one would, after a short
 * delay:
 * - a scan photo: a Monstera with two look-alikes (in a terracotta pot that
 *   needs repotting);
 * - a diagnosis photo: in turn a plant to treat (too much water, with a
 *   longer watering interval), one to watch (not enough light) and a healthy
 *   one;
 * - a sheet: the whole sheet for the species named in the prompt, or its
 *   texts only for a species of the reference base (the app adds the base's
 *   figures);
 * - a question: a short answer written word by word through `onText`.
 * Deleting it from the model card and downloading it again shows the "not
 * ready" states.
 */

import type { CareSheet } from '@/lib/care-sheet';
import type { Diagnosis } from '@/lib/diagnosis';
import type { Identification } from '@/lib/identification';

import type { AiEngine, GenerateRequest, ModelStatus } from './types';

const SIZE_BYTES = 2_600_000_000;
const ANSWER_DELAY_MS = 1500;
/** A chat answer is written a word at a time, about ten words a second. */
const WORD_DELAY_MS = 90;

let status: ModelStatus = { state: 'ready', sizeBytes: SIZE_BYTES };
const listeners = new Set<() => void>();
let download: { timer: ReturnType<typeof setInterval>; done: () => void } | null = null;

function setStatus(next: ModelStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const aborted = () => {
      clearTimeout(timer);
      const error = new Error('Annulé.');
      error.name = 'AbortError';
      reject(error);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', aborted);
      resolve();
    }, ms);
    if (signal?.aborted) aborted();
    else signal?.addEventListener('abort', aborted, { once: true });
  });
}

const IDENTIFICATION: Identification = {
  is_plant: true,
  candidates: [
    { scientific_name: 'Monstera deliciosa', common_name: 'Faux philodendron', confidence: 0.82 },
    { scientific_name: 'Thaumatophyllum bipinnatifidum', common_name: 'Philodendron selloum', confidence: 0.11 },
    { scientific_name: 'Rhaphidophora tetrasperma', common_name: 'Mini monstera', confidence: 0.05 },
  ],
  photo: {
    pot: { material: 'terracotta', diameter_cm: 17 },
    repot: { needed: 'yes', reason: 'Des racines sortent par le trou du pot.' },
    observations: ['Feuilles du bas un peu jaunies', 'Terre sèche en surface'],
  },
};

const SHEETS: CareSheet[] = [
  {
    common_name: 'Faux philodendron',
    scientific_name: 'Monstera deliciosa',
    light: 'bright_indirect',
    watering: {
      interval_days: 7,
      winter_factor: 1.5,
      advice: 'Arrose quand les 3 premiers centimètres de terreau sont secs, puis vide la soucoupe.',
    },
    humidity: 'medium',
    temperature: { min_c: 15, max_c: 30 },
    toxicity: { cats: 'toxic', dogs: 'toxic' },
    fertilizing: { interval_days: 14 },
    misting: { interval_days: 4 },
    repotting: {
      interval_days: 730,
      advice: 'Au printemps, quand les racines sortent du pot, dans un pot 3 à 5 cm plus large.',
    },
    substrate: 'Terreau pour plantes vertes mélangé à un tiers d’écorce de pin et de perlite.',
    pot: 'Pot percé et lourd, assez stable pour porter ses grandes feuilles et un tuteur.',
    propagation: 'Bouture une tige avec un nœud et une racine aérienne, dans l’eau ou du terreau humide.',
    problems: [
      {
        symptom: 'Feuilles qui jaunissent',
        cause: 'Trop d’eau, ou une soucoupe restée pleine',
        fix: 'Espace les arrosages et vide la soucoupe.',
      },
      {
        symptom: 'Nouvelles feuilles sans découpes',
        cause: 'Manque de lumière',
        fix: 'Rapproche-la d’une fenêtre lumineuse.',
      },
      {
        symptom: 'Bords des feuilles bruns et secs',
        cause: 'Air trop sec',
        fix: 'Brumise-la et éloigne-la des radiateurs.',
      },
    ],
    tips: [
      'Installe un tuteur en mousse pour guider ses racines aériennes.',
      'Dépoussière ses grandes feuilles avec un chiffon humide.',
      'Évite le soleil direct de l’après-midi, qui brûle les feuilles.',
    ],
    reference_id: null,
  },
  {
    common_name: 'Philodendron selloum',
    scientific_name: 'Thaumatophyllum bipinnatifidum',
    light: 'bright_indirect',
    watering: {
      interval_days: 7,
      winter_factor: 2,
      advice: 'Laisse sécher le dessus du terreau entre deux arrosages.',
    },
    humidity: 'medium',
    temperature: { min_c: 13, max_c: 30 },
    toxicity: { cats: 'toxic', dogs: 'toxic' },
    fertilizing: { interval_days: 21 },
    misting: null,
    repotting: {
      interval_days: 730,
      advice: 'Au printemps, dans un pot plus large ; une fois adulte, change juste le dessus du terreau.',
    },
    substrate: 'Terreau pour plantes vertes bien drainant, enrichi d’un peu de compost.',
    pot: 'Grand pot lourd et percé, en terre cuite ou en céramique, pour qu’il ne bascule pas.',
    propagation: 'Divise la touffe au rempotage, ou replante un rejet qui pousse au pied.',
    problems: [
      {
        symptom: 'Feuilles du bas qui jaunissent',
        cause: 'Excès d’eau, ou vieillissement normal',
        fix: 'Laisse sécher le terreau en surface et coupe les feuilles abîmées.',
      },
      {
        symptom: 'Taches brunes et sèches',
        cause: 'Coup de soleil direct',
        fix: 'Protège-le du soleil de l’après-midi.',
      },
    ],
    tips: [
      'Il prend vite de la place : prévois-lui un coin spacieux.',
      'Tourne le pot d’un quart de tour chaque mois pour qu’il pousse droit.',
    ],
    reference_id: null,
  },
  {
    common_name: 'Mini monstera',
    scientific_name: 'Rhaphidophora tetrasperma',
    light: 'bright_indirect',
    watering: {
      interval_days: 6,
      winter_factor: 1.5,
      advice: 'Garde le terreau légèrement frais, sans jamais le détremper.',
    },
    humidity: 'high',
    temperature: { min_c: 15, max_c: 28 },
    toxicity: { cats: 'toxic', dogs: 'toxic' },
    fertilizing: { interval_days: 14 },
    misting: { interval_days: 3 },
    repotting: {
      interval_days: 365,
      advice: 'Chaque printemps, dans un pot à peine plus grand : elle pousse vite.',
    },
    substrate: 'Terreau léger pour aroïdées : terreau, écorce de pin et perlite à parts égales.',
    pot: 'Pot en plastique percé glissé dans un cache-pot, pour garder le terreau frais.',
    propagation: 'Coupe une tige sous un nœud et mets-la dans un verre d’eau : elle racine en 2 à 3 semaines.',
    problems: [
      {
        symptom: 'Bords des feuilles qui brunissent',
        cause: 'Air trop sec',
        fix: 'Brumise-la ou installe-la dans une pièce plus humide.',
      },
      {
        symptom: 'Tiges longues et dégarnies',
        cause: 'Manque de lumière',
        fix: 'Rapproche-la de la lumière et taille les tiges.',
      },
      {
        symptom: 'Fines toiles sous les feuilles',
        cause: 'Araignées rouges',
        fix: 'Douche le feuillage et augmente l’humidité.',
      },
    ],
    tips: [
      'Grimpante : donne-lui un tuteur ou laisse-la retomber d’une étagère.',
      'Une salle de bain lumineuse lui convient très bien.',
    ],
    reference_id: null,
  },
];

/** A plausible sheet for a species the fake does not know. */
function genericSheet(name: string): CareSheet {
  return {
    common_name: name,
    scientific_name: name,
    light: 'bright_indirect',
    watering: {
      interval_days: 7,
      winter_factor: 1.5,
      advice: 'Arrose quand le dessus du terreau est sec au toucher.',
    },
    humidity: 'medium',
    temperature: { min_c: 12, max_c: 28 },
    toxicity: { cats: 'unknown', dogs: 'unknown' },
    fertilizing: { interval_days: 21 },
    misting: null,
    repotting: {
      interval_days: 730,
      advice: 'Au printemps, quand les racines remplissent le pot, dans un pot 2 à 3 cm plus large.',
    },
    substrate: 'Terreau de qualité pour plantes d’intérieur, avec des billes d’argile au fond.',
    pot: 'Pot percé, avec une soucoupe que tu vides après l’arrosage.',
    // Shows the case of a species that does not propagate easily at home.
    propagation: '',
    problems: [
      {
        symptom: 'Feuilles jaunes et molles',
        cause: 'Trop d’eau',
        fix: 'Laisse sécher le dessus du terreau avant d’arroser.',
      },
      {
        symptom: 'Feuilles sèches et cassantes',
        cause: 'Manque d’eau ou air trop sec',
        fix: 'Arrose plus régulièrement et éloigne-la du radiateur.',
      },
    ],
    tips: [
      'Place-la près d’une fenêtre, sans soleil brûlant.',
      'Réduis les arrosages en hiver, quand elle pousse moins.',
    ],
    reference_id: null,
  };
}

const DIAGNOSES: Diagnosis[] = [
  {
    status: 'treat',
    summary:
      'Les feuilles jaunes et molles, avec un terreau souvent encore humide, font penser à trop d’eau. Ce sont des pistes à vérifier.',
    problems: [
      {
        name: 'Excès d’arrosage',
        kind: 'care',
        confidence: 0.7,
        signs: 'Feuilles du bas jaunes et molles, terreau encore humide plusieurs fois de suite.',
        actions: [
          'Laisse sécher le terreau sur 3 cm avant d’arroser.',
          'Vide la soucoupe après chaque arrosage.',
          'Vérifie que le pot est bien percé.',
        ],
      },
      {
        name: 'Pourriture des racines',
        kind: 'disease',
        confidence: 0.3,
        signs: 'La base des tiges paraît sombre.',
        actions: ['Dépote-la et coupe les racines brunes et molles.', 'Rempote dans un terreau sec et drainant.'],
      },
    ],
    watering_change: 'less',
    light_change: 'none',
  },
  {
    status: 'watch',
    summary: 'Elle s’étire vers la lumière : rien de grave, mais elle serait mieux plus près d’une fenêtre.',
    problems: [
      {
        name: 'Manque de lumière',
        kind: 'environment',
        confidence: 0.6,
        signs: 'Tiges longues et nouvelles feuilles plus petites.',
        actions: ['Rapproche-la d’une fenêtre lumineuse, sans soleil brûlant.'],
      },
      {
        name: 'Araignées rouges',
        kind: 'pest',
        confidence: 0.2,
        signs: 'Feuilles un peu ternes.',
        actions: ['Regarde le dessous des feuilles à la loupe.', 'Douche le feuillage à l’eau tiède.'],
      },
    ],
    watering_change: 'none',
    light_change: 'more',
  },
  {
    status: 'healthy',
    summary: 'Elle a l’air en forme : feuilles fermes et bien vertes. Continue comme ça.',
    problems: [],
    watering_change: 'none',
    light_change: 'none',
  },
];
let diagnoses = 0;

const CHAT_ANSWERS: { words: RegExp; answer: string }[] = [
  {
    words: /jaun/i,
    answer:
      'Des feuilles qui jaunissent viennent le plus souvent d’un excès d’eau. Touche le terreau : s’il est encore humide à deux doigts de profondeur, attends avant d’arroser et vide la soucoupe. Si seules les vieilles feuilles du bas jaunissent, c’est souvent normal.',
  },
  {
    words: /rempot/i,
    answer:
      'Le meilleur moment pour la rempoter, c’est au printemps, de mars à mai. Fais-le quand les racines sortent par le trou du pot. Prends un pot 2 à 3 cm plus large, percé, avec un terreau frais, puis arrose bien.',
  },
  {
    words: /plac|où|lumi|soleil|fenêtre/i,
    answer:
      'Mets-la près d’une fenêtre lumineuse, mais sans soleil direct l’après-midi, qui brûle les feuilles. Évite les radiateurs et les courants d’air. Si ses tiges s’étirent, c’est qu’elle manque de lumière.',
  },
];
const CHAT_FALLBACK =
  'Je ne peux pas te répondre avec certitude sans en savoir plus. Décris-moi ce que tu vois sur la plante, ou fais un diagnostic avec une photo prise de près.';

/** The texts of a sheet, as asked for a species of the reference base. */
function sheetTexts(sheet: CareSheet) {
  return {
    watering_advice: sheet.watering.advice,
    repotting_advice: sheet.repotting.advice,
    substrate: sheet.substrate,
    pot: sheet.pot,
    propagation: sheet.propagation,
    problems: sheet.problems,
    tips: sheet.tips,
  };
}

/** Field names the request's JSON Schema asks for. */
function schemaFields(request: GenerateRequest): readonly string[] {
  return (request.jsonSchema as { required?: readonly string[] } | undefined)?.required ?? [];
}

/** The answer, and whether it is free text written word by word. */
function answer(request: GenerateRequest): { text: string; words: boolean } {
  const fields = schemaFields(request);
  if (request.imageUri && fields.includes('status')) {
    const diagnosis = DIAGNOSES[diagnoses++ % DIAGNOSES.length];
    return { text: JSON.stringify(diagnosis), words: false };
  }
  if (request.imageUri) return { text: JSON.stringify(IDENTIFICATION), words: false };
  // Questions end the prompt with "Question : …", after the plant's context.
  const question = request.prompt.match(/^Question : (.+)$/m)?.[1];
  if (question) {
    const text = CHAT_ANSWERS.find(({ words }) => words.test(question))?.answer ?? CHAT_FALLBACK;
    return { text, words: true };
  }
  // The sheet prompt names the species between « ».
  const name = request.prompt.match(/«\s*([^»]+?)\s*»/)?.[1] ?? 'Plante inconnue';
  const sheet =
    SHEETS.find(
      (s) =>
        s.scientific_name.toLowerCase() === name.toLowerCase() ||
        s.common_name.toLowerCase() === name.toLowerCase(),
    ) ?? genericSheet(name);
  if (fields.includes('watering_advice')) return { text: JSON.stringify(sheetTexts(sheet)), words: false };
  // Written as the schema asks (misting 0 for none), wrapped in a code fence
  // as small models like to do.
  const json = JSON.stringify({ ...sheet, misting: sheet.misting ?? { interval_days: 0 } }, null, 2);
  return { text: `Voici la fiche :\n\`\`\`json\n${json}\n\`\`\``, words: false };
}

/** Writes `text` a word at a time through `onText`, like the real model streams it. */
async function writeWords(text: string, { onText, signal }: GenerateRequest): Promise<string> {
  let written = '';
  for (const word of text.split(' ')) {
    await wait(WORD_DELAY_MS, signal);
    written = written ? `${written} ${word}` : word;
    onText?.(written);
  }
  return written;
}

export const fakeEngine: AiEngine = {
  info: { name: 'Modèle factice', sizeBytes: SIZE_BYTES },
  getStatus: () => status,
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  download() {
    if (status.state === 'ready' || download) return Promise.resolve();
    return new Promise((resolve) => {
      let progress = 0;
      setStatus({ state: 'downloading', progress, sizeBytes: SIZE_BYTES });
      const timer = setInterval(() => {
        progress = Math.min(progress + 0.1, 1);
        if (progress < 1) {
          setStatus({ state: 'downloading', progress, sizeBytes: SIZE_BYTES });
          return;
        }
        clearInterval(timer);
        download = null;
        setStatus({ state: 'ready', sizeBytes: SIZE_BYTES });
        resolve();
      }, 300);
      download = { timer, done: resolve };
    });
  },
  cancelDownload() {
    if (!download) return;
    clearInterval(download.timer);
    download.done();
    download = null;
    setStatus({ state: 'not_downloaded', sizeBytes: SIZE_BYTES });
  },
  async deleteModel() {
    setStatus({ state: 'not_downloaded', sizeBytes: SIZE_BYTES });
  },
  async generate(request) {
    if (status.state !== 'ready') throw new Error('Le modèle n’est pas encore téléchargé.');
    await wait(ANSWER_DELAY_MS, request.signal);
    const reply = answer(request);
    return reply.words ? writeWords(reply.text, request) : reply.text;
  },
};
