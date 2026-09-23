/**
 * A pretend model for development (browser, Expo Go), turned on with
 * EXPO_PUBLIC_FAKE_AI=1. It answers like the real one would, after a short
 * delay: a Monstera with two look-alikes for any photo (in a terracotta pot
 * that needs repotting), and a care sheet for the species named in the
 * prompt. Deleting it from the model card and downloading it again shows the
 * "not ready" states.
 */

import type { CareSheet } from '@/lib/care-sheet';
import type { Identification } from '@/lib/identification';

import type { AiEngine, GenerateRequest, ModelStatus } from './types';

const SIZE_BYTES = 2_600_000_000;
const ANSWER_DELAY_MS = 1500;

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
  };
}

function answer(request: GenerateRequest): string {
  if (request.imageUri) return JSON.stringify(IDENTIFICATION);
  // The sheet prompt names the species between « ».
  const name = request.prompt.match(/«\s*([^»]+?)\s*»/)?.[1] ?? 'Plante inconnue';
  const sheet =
    SHEETS.find(
      (s) =>
        s.scientific_name.toLowerCase() === name.toLowerCase() ||
        s.common_name.toLowerCase() === name.toLowerCase(),
    ) ?? genericSheet(name);
  // Written as the schema asks (misting 0 for none), wrapped in a code fence
  // as small models like to do.
  const json = JSON.stringify({ ...sheet, misting: sheet.misting ?? { interval_days: 0 } }, null, 2);
  return `Voici la fiche :\n\`\`\`json\n${json}\n\`\`\``;
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
    return answer(request);
  },
};
