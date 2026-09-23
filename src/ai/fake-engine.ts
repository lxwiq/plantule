/**
 * A pretend model for development (browser, Expo Go), turned on with
 * EXPO_PUBLIC_FAKE_AI=1. It answers like the real one would, after a short
 * delay: a Monstera with two look-alikes for any photo, and a care sheet for
 * the species named in the prompt. Deleting it from the model card and
 * downloading it again shows the "not ready" states.
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
    repotting: { interval_days: 730 },
    tips: [
      'Installe un tuteur en mousse pour guider ses racines aériennes.',
      'Dépoussière ses grandes feuilles avec un chiffon humide.',
      'Évite le soleil direct de l’après-midi, qui brûle les feuilles.',
      'Des feuilles qui jaunissent signalent souvent un excès d’eau.',
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
    repotting: { interval_days: 730 },
    tips: [
      'Il prend vite de la place : prévois un grand pot stable.',
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
    repotting: { interval_days: 365 },
    tips: [
      'Grimpante : donne-lui un tuteur ou laisse-la retomber d’une étagère.',
      'Une salle de bain lumineuse lui convient très bien.',
      'Taille les tiges trop longues pour la garder touffue.',
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
    repotting: { interval_days: 730 },
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
