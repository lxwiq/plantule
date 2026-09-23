/**
 * Calendar dates are "YYYY-MM-DD" strings, as sent by the API. They are
 * compared as local calendar days, never as instants.
 */

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
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

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of an instant. */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): string {
  return toDateString(new Date());
}

/** Parses "YYYY-MM-DD" as a local date at midnight. */
export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [a, b] = [parseDate(from), parseDate(to)];
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export function formatLongDate(value: string): string {
  const date = parseDate(value);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatShortDate(value: string): string {
  const date = parseDate(value);
  const withYear = date.getFullYear() !== new Date().getFullYear();
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ''}`;
}

/** "aujourd'hui", "demain", "dans 3 jours", "en retard de 2 jours"... */
export function formatDue(dueOn: string, reference = today()): string {
  const days = daysBetween(reference, dueOn);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  if (days === -1) return 'en retard d’1 jour';
  if (days < 0) return `en retard de ${-days} jours`;
  if (days < 7) return `dans ${days} jours`;
  if (days < 14) return 'dans 1 semaine';
  return `le ${formatShortDate(dueOn)}`;
}

/** "à l'instant", "il y a 5 min", "hier à 9:30", "le 3 mars"... */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  const time = `${date.getHours()}:${pad(date.getMinutes())}`;
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const days = daysBetween(toDateString(date), toDateString(now));
  if (days === 0) return `aujourd'hui à ${time}`;
  if (days === 1) return `hier à ${time}`;
  if (days < 7) return `${WEEKDAYS[date.getDay()]} à ${time}`;
  return `le ${formatShortDate(toDateString(date))}`;
}

export function formatInterval(days: number): string {
  if (days === 1) return 'tous les jours';
  if (days === 7) return 'toutes les semaines';
  if (days % 7 === 0 && days <= 56) return `toutes les ${days / 7} semaines`;
  if (days === 30 || days === 31) return 'tous les mois';
  return `tous les ${days} jours`;
}
