/**
 * The "Plantule expert": the instructions shared by every question asked of
 * the model (scan, sheet, diagnosis, chat), and what the app knows about a
 * plant, written compactly enough to fit in the model's small context.
 */

import { getPlant, getRoom, getSpeciesSheet, listPlantEvents, listPlantTasks } from '@/db/repo';
import type { EventKind, Light, TaskKind } from '@/db/types';
import type { CareSheet } from '@/lib/care-sheet';
import { daysBetween, toDateString, today } from '@/lib/dates';
import { TASK_KINDS } from '@/lib/labels';
import { formatRain } from '@/lib/weather';
import {
  everyText,
  figuresLines,
  findReference,
  getReference,
  lightText,
  type CareFigures,
  type ReferencePlant,
} from '@/lib/plant-reference';

/**
 * System instructions of the expert, shared by every request. JSON tasks add
 * their own format instruction after it; the chat answers in plain text.
 */
export const EXPERT_SYSTEM =
  'Tu es l’expert de Plantule, une app qui aide des particuliers en France à soigner leurs plantes ' +
  'd’intérieur, de balcon et leurs aromatiques. Tu es un jardinier prudent et un bon botaniste. ' +
  'Tu écris en français, en tutoyant, avec des phrases courtes et concrètes. ' +
  'Tu t’appuies sur ce qu’on te dit de la plante et sur les données vérifiées quand on t’en donne, sans inventer d’autres chiffres. ' +
  'Quand tu ne sais pas, ou que la photo ne permet pas de le dire, tu le dis au lieu d’inventer. ' +
  'Si un animal a mangé une plante toxique, tu conseilles d’appeler tout de suite un vétérinaire.';

/** What the app knows about a plant, handed to the model with a question about it. */
export type PlantContext = {
  nickname: string;
  /** As typed or confirmed after a scan. */
  species: string | null;
  sheet: CareSheet | null;
  reference: ReferencePlant | null;
  room: { name: string; light: Light | null; isOutdoor: boolean } | null;
  /** "YYYY-MM-DD", the day the context was read: past care is told in days ago. */
  today: string;
  /** 1 (January) to 12. */
  month: number;
  /** Care done, postponed or "soil still wet", most recent first, at most 8. `rainMm` when the rain did it. */
  recentEvents: {
    kind: EventKind;
    taskKind: TaskKind;
    day: string;
    postponedDays: number | null;
    rainMm?: number;
  }[];
  /** The plant's watering task, if it has one. */
  watering: { intervalDays: number; winterFactor: number; wetStreak: number; nextDueOn: string } | null;
  /** Free text from the plant's form, e.g. "Terre cuite, 20 cm". */
  pot: string | null;
  substrate: string | null;
  notes: string | null;
};

export const MAX_RECENT_EVENTS = 8;
/** About 600 tokens of French. */
export const MAX_CONTEXT_LENGTH = 2000;
/** Watering entries kept first: they are what tells too much water from too little. */
const MAX_WATERING_EVENTS = 5;
/** Journal entries read to pick the recent ones from. */
const EVENTS_READ = 40;
/** Longest free texts told to the model, so that the context stays within its budget. */
const MAX_NOTES_LENGTH = 200;
const MAX_NAME_LENGTH = 50;
const MAX_PROBLEM_LENGTH = 35;

/** Reads the plant, its sheet, room, tasks and journal. Null when the plant does not exist. */
export function buildPlantContext(plantId: string): PlantContext | null {
  const plant = getPlant(plantId);
  if (!plant) return null;
  const sheet = plant.species_sheet_id ? (getSpeciesSheet(plant.species_sheet_id)?.data ?? null) : null;
  const reference =
    (sheet?.reference_id ? getReference(sheet.reference_id) : null) ??
    (plant.species ? findReference(plant.species) : null) ??
    (sheet ? findReference(sheet.scientific_name) : null);
  const room = plant.room_id ? getRoom(plant.room_id) : null;
  const water = listPlantTasks(plantId).find((task) => task.kind === 'water') ?? null;

  const events = listPlantEvents(plantId, EVENTS_READ);
  const watering = events.filter((event) => event.task_kind === 'water').slice(0, MAX_WATERING_EVENTS);
  const others = events
    .filter((event) => event.task_kind !== 'water')
    .slice(0, MAX_RECENT_EVENTS - watering.length);
  const recentEvents = [...watering, ...others]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .map((event) => ({
      kind: event.kind,
      taskKind: event.task_kind,
      day: toDateString(new Date(event.occurred_at)),
      postponedDays: event.postponed_days,
      ...(event.rain_mm != null ? { rainMm: event.rain_mm } : {}),
    }));

  const day = today();
  return {
    nickname: plant.nickname,
    species: plant.species,
    sheet,
    reference,
    room: room ? { name: room.name, light: room.light, isOutdoor: room.is_outdoor } : null,
    today: day,
    month: Number(day.slice(5, 7)),
    recentEvents,
    watering: water
      ? {
          intervalDays: water.interval_days,
          winterFactor: water.winter_factor,
          wetStreak: water.wet_streak,
          nextDueOn: water.next_due_on,
        }
      : null,
    pot: plant.pot,
    substrate: plant.substrate,
    notes: plant.notes,
  };
}

// Wording

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** The app's seasons: November to February is the rest, when watering is spaced out. */
function seasonText(month: number): string {
  if (month >= 11 || month <= 2) return 'hiver, repos : arrosages espacés, pas d’engrais';
  if (month <= 5) return 'printemps : la plante repart';
  if (month <= 8) return 'été : pleine pousse';
  return 'automne : la pousse ralentit';
}

/** Trimmed, single spaces, cut at a word before `max` characters. */
export function shorten(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function sheetFigures(sheet: CareSheet): CareFigures {
  return {
    light: sheet.light,
    watering: { interval_days: sheet.watering.interval_days, winter_factor: sheet.watering.winter_factor },
    humidity: sheet.humidity,
    temperature: sheet.temperature,
    toxicity: sheet.toxicity,
    fertilizing_interval_days: sheet.fertilizing.interval_days,
    misting_interval_days: sheet.misting?.interval_days ?? 0,
    repotting_interval_days: sheet.repotting.interval_days,
  };
}

/** "aujourd’hui", "hier", "il y a 5 j". */
function daysAgo(day: string, from: string): string {
  const days = daysBetween(day, from);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
}

function eventText({ kind, taskKind, postponedDays, rainMm }: PlantContext['recentEvents'][number]): string {
  const label = TASK_KINDS[taskKind].label.toLowerCase();
  if (rainMm !== undefined) return `${label} fait par la pluie (${formatRain(rainMm)})`;
  const by = postponedDays ? ` de ${postponedDays} j` : '';
  if (kind === 'soil_wet') return `${label} reporté${by}, terreau encore humide`;
  if (kind === 'snoozed') return `${label} reporté${by}`;
  return `${label} fait`;
}

function dueText(nextDueOn: string, from: string): string {
  const days = daysBetween(from, nextDueOn);
  if (days < 0) return `en retard de ${-days} j`;
  if (days === 0) return 'prévu aujourd’hui';
  if (days === 1) return 'prévu demain';
  return `prévu dans ${days} j`;
}

/**
 * The context as a compact French text for the prompt: about 600 tokens at
 * most (MAX_CONTEXT_LENGTH characters), whatever the notes and the journal
 * hold. The oldest care entries give way first.
 */
export function contextText(context: PlantContext): string {
  const { sheet, reference, room, watering } = context;
  const lines: string[] = [];

  const name = sheet
    ? `${shorten(sheet.common_name, MAX_NAME_LENGTH)} (${sheet.scientific_name})`
    : reference
      ? `${reference.common_names[0]} (${reference.scientific_name})`
      : context.species
        ? shorten(context.species, MAX_NAME_LENGTH)
        : 'espèce inconnue';
  lines.push(`Plante : « ${shorten(context.nickname, MAX_NAME_LENGTH)} », ${name}.`);

  if (reference) {
    lines.push('Données vérifiées de l’espèce, en pot :', ...figuresLines(reference).map((line) => `- ${line}`));
  } else if (sheet) {
    lines.push('Fiche de l’espèce :', ...figuresLines(sheetFigures(sheet)).map((line) => `- ${line}`));
  }
  if (sheet && sheet.problems.length > 0) {
    const problems = sheet.problems.map(
      (p) => `${lowerFirst(shorten(p.symptom, MAX_PROBLEM_LENGTH))} (${lowerFirst(shorten(p.cause, MAX_PROBLEM_LENGTH))})`,
    );
    lines.push(`Problèmes fréquents de l’espèce : ${problems.join(' ; ')}.`);
  }

  lines.push(
    room
      ? `Pièce : ${shorten(room.name, MAX_NAME_LENGTH)}, ${room.isOutdoor ? 'dehors' : 'à l’intérieur'}${
          room.light ? `, ${lightText(room.light)}` : ''
        }.`
      : 'Pièce : pas indiquée.',
  );
  const pot = [
    context.pot && `Pot : ${shorten(context.pot, MAX_NAME_LENGTH)}.`,
    context.substrate && `Substrat : ${shorten(context.substrate, MAX_NAME_LENGTH)}.`,
  ].filter(Boolean);
  if (pot.length > 0) lines.push(pot.join(' '));
  lines.push(`Mois : ${MONTHS[context.month - 1] ?? '?'} (${seasonText(context.month)}).`);

  if (watering) {
    const winter = watering.winterFactor === 1 ? '' : ` (×${String(watering.winterFactor).replace('.', ',')} en hiver)`;
    lines.push(
      `Rappel d’arrosage : ${everyText(watering.intervalDays)}${winter} ; ${dueText(watering.nextDueOn, context.today)}.`,
    );
    if (watering.wetStreak > 0) {
      lines.push(`Terreau encore humide ${watering.wetStreak} fois de suite depuis le dernier arrosage.`);
    }
  } else {
    lines.push('Pas de rappel d’arrosage dans l’app.');
  }

  const events = context.recentEvents
    .slice(0, MAX_RECENT_EVENTS)
    .map((event) => `- ${daysAgo(event.day, context.today)} : ${eventText(event)}`);
  const notes = context.notes?.trim() ? [`Notes : ${shorten(context.notes, MAX_NOTES_LENGTH)}`] : [];
  const text = () =>
    [
      ...lines,
      ...(events.length > 0
        ? ['Derniers soins, du plus récent au plus ancien :', ...events]
        : ['Aucun soin noté dans l’app pour l’instant.']),
      ...notes,
    ].join('\n');
  while (events.length > 1 && text().length > MAX_CONTEXT_LENGTH) events.pop();
  return text();
}
