/**
 * What Pépin says at the top of the Today screen: hello for the time of day,
 * then a word on the day's care. Each situation has a few wordings; the one
 * shown is picked from the date, so it stays the same all day.
 */

import type { Mood } from '@/art/types';
import type { Task } from '@/db/types';

import { isDoneToday } from './tasks';

/** « Le vestiaire de Pépin », or « d’Olive » before a vowel. */
export function wardrobeTitle(name: string): string {
  return /^[aeiouyàâäéèêëîïôöùûüœ]/i.test(name) ? `Le vestiaire d’${name}` : `Le vestiaire de ${name}`;
}

export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export function partOfDay(hour: number): PartOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** Where the day's care stands, counted in plants (each plant once, in the most pressing group). */
export type CareToday = {
  /** Plants whose watering is late. */
  thirsty: number;
  /** Other plants with late care. */
  late: number;
  /** Plants with care due today, and nothing late. */
  due: number;
  /** Care done today. */
  done: number;
};

export function careToday(tasks: Task[], day: string): CareToday {
  const thirsty = new Set<string>();
  const late = new Set<string>();
  const due = new Set<string>();
  let done = 0;
  for (const task of tasks) {
    if (task.next_due_on < day) (task.kind === 'water' ? thirsty : late).add(task.plant_id);
    else if (task.next_due_on === day) due.add(task.plant_id);
    if (isDoneToday(task, day)) done++;
  }
  for (const id of thirsty) late.delete(id);
  for (const id of [...thirsty, ...late]) due.delete(id);
  return { thirsty: thirsty.size, late: late.size, due: due.size, done };
}

export type GreetingInput = {
  /** Local hour, 0–23. */
  hour: number;
  /** "YYYY-MM-DD": picks the wording of the day. */
  day: string;
  /** The mascot's name. */
  name: string;
  plantCount: number;
  care: CareToday;
};

export type Greeting = {
  /** Pépin's face. */
  mood: Mood;
  /** "Bonjour !", "Bonsoir !"… */
  hello: string;
  message: string;
};

const HELLO: Record<PartOfDay, string[]> = {
  morning: ['Bonjour !', 'Coucou, bien dormi ?', 'Bonjour, belle journée à toi !'],
  afternoon: ['Bon après-midi !', 'Coucou !', 'Re-coucou !'],
  evening: ['Bonsoir !', 'Douce soirée !', 'Coucou, ça va ce soir ?'],
  night: ['Encore debout ?', 'Bonsoir, oiseau de nuit !', 'Chut, les plantes dorment…'],
};

/** djb2, to pick a wording from the day. */
function hash(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Pépin's words for the day. */
export function greeting({ hour, day, name, plantCount, care }: GreetingInput): Greeting {
  const part = partOfDay(hour);
  const late = part === 'evening' || part === 'night';
  const pick = (key: string, options: string[]) => options[hash(`${day}:${key}`) % options.length];
  const hello = pick(part, HELLO[part]);
  const say = (mood: Mood, key: string, options: string[]) => ({ mood, hello, message: pick(key, options) });

  if (plantCount === 0) {
    return say('happy', 'empty', [
      `Moi, c’est ${name}. Ajoute ta première plante, je veillerai sur elle avec toi.`,
      'C’est un peu vide ici… On ajoute une première plante ensemble ?',
    ]);
  }

  const { thirsty, late: waiting, due, done } = care;
  if (thirsty > 0) {
    return say(
      'thirsty',
      'thirsty',
      thirsty === 1
        ? ['Une plante a soif, on s’en occupe ?', 'Une plante réclame un verre d’eau. On y va ?']
        : [`${thirsty} plantes ont soif, on s’en occupe ?`, `${thirsty} plantes réclament à boire. On y va ensemble ?`],
    );
  }
  if (waiting > 0) {
    return say(
      'worried',
      'late',
      waiting === 1
        ? ['Une plante attend son soin. On s’en occupe tranquillement ?', 'Un soin a pris un peu de retard. Pas de panique, on s’y met ?']
        : [`${waiting} plantes attendent leurs soins. Pas de panique, on s’y met ?`, `${waiting} plantes attendent un soin. Une à la fois, tranquillement.`],
    );
  }
  if (due > 0) {
    if (late) {
      return say('happy', 'due-evening', [`Il reste ${due === 1 ? 'une plante' : `${due} plantes`} à chouchouter ce soir.`]);
    }
    return say(
      'happy',
      'due',
      due === 1
        ? ['Une plante compte sur toi aujourd’hui.', 'Un petit soin au programme aujourd’hui.']
        : [`${due} plantes comptent sur toi aujourd’hui.`, `Au programme : ${due} plantes à chouchouter.`],
    );
  }
  if (late) {
    return say(
      'sleepy',
      'rest',
      done > 0
        ? ['Tout le monde est bichonné… On peut aller se reposer.', 'Journée bien remplie. Bonne nuit, les plantes…']
        : ['Rien à faire ce soir, les plantes se reposent… et moi aussi.', 'Tout est calme. Les plantes font de beaux rêves.'],
    );
  }
  return say(
    'joy',
    'done',
    done > 0
      ? ['Tout le monde est bichonné, bravo !', `Mission accomplie ! Les plantes et ${name} te disent merci.`]
      : ['Rien à faire aujourd’hui : les plantes se prélassent.', 'Journée tranquille, profite de tes plantes.'],
  );
}
