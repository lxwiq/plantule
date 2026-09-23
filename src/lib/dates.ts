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

/** "1er", "2", "3"… as French dates write the day. */
const dayOfMonth = (date: Date) => (date.getDate() === 1 ? '1er' : String(date.getDate()));

export function formatLongDate(value: string): string {
  const date = parseDate(value);
  return `${WEEKDAYS[date.getDay()]} ${dayOfMonth(date)} ${MONTHS[date.getMonth()]}`;
}

export function formatShortDate(value: string): string {
  const date = parseDate(value);
  const withYear = date.getFullYear() !== new Date().getFullYear();
  return `${dayOfMonth(date)} ${MONTHS[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ''}`;
}

/** "aujourd’hui", "demain", "dans 3 jours", "en retard de 2 jours"... */
export function formatDue(dueOn: string, reference = today()): string {
  const days = daysBetween(reference, dueOn);
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'demain';
  if (days === -1) return 'en retard d’1 jour';
  if (days < 0) return `en retard de ${-days} jours`;
  if (days < 7) return `dans ${days} jours`;
  if (days < 14) return 'dans 1 semaine';
  return `le ${formatShortDate(dueOn)}`;
}

/** "aujourd’hui", "hier", "avant-hier", "il y a 4 jours", "le 3 mars": a past day, without the time. */
export function formatRelativeDay(value: string, reference = today()): string {
  const days = daysBetween(value, reference);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  if (days === 2) return 'avant-hier';
  if (days < 7) return `il y a ${days} jours`;
  return `le ${formatShortDate(value)}`;
}

/** "à l’instant", "il y a 5 min", "hier à 9:30", "le 3 mars"... */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  const time = `${date.getHours()}:${pad(date.getMinutes())}`;
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const days = daysBetween(toDateString(date), toDateString(now));
  if (days === 0) return `aujourd’hui à ${time}`;
  if (days === 1) return `hier à ${time}`;
  if (days < 7) return `${WEEKDAYS[date.getDay()]} à ${time}`;
  return `le ${formatShortDate(toDateString(date))}`;
}

/** "tous les jours", "toutes les 2 semaines", "tous les 3 mois", "tous les 2 ans", else in days. */
export function formatInterval(days: number): string {
  if (days === 1) return 'tous les jours';
  if (days === 7) return 'toutes les semaines';
  if (days % 7 === 0 && days <= 56) return `toutes les ${days / 7} semaines`;
  // Months and years only when the interval is close to a whole number of them.
  const years = Math.round(days / 365);
  if (years >= 1 && Math.abs(days - years * 365) <= 15) {
    return years === 1 ? 'tous les ans' : `tous les ${years} ans`;
  }
  const months = Math.round(days / 30.4);
  if (months >= 1 && Math.abs(days - months * 30.4) <= Math.max(3, months)) {
    return months === 1 ? 'tous les mois' : `tous les ${months} mois`;
  }
  return `tous les ${days} jours`;
}
