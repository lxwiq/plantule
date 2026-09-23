/**
 * Cuttings: how they are started, where they are at, and what the plant they
 * become is told about them.
 */

import type { Cutting, CuttingMethod, CuttingStatus } from '@/db/types';

import { daysBetween, formatElapsed, formatShortDate } from './dates';

export const CUTTING_METHODS: Record<CuttingMethod, { label: string; in: string }> = {
  water: { label: 'Eau', in: 'dans l’eau' },
  soil: { label: 'Terreau', in: 'en terreau' },
  sphagnum: { label: 'Sphaigne', in: 'dans la sphaigne' },
  perlite: { label: 'Perlite', in: 'dans la perlite' },
  other: { label: 'Autre', in: '' },
};

export const CUTTING_METHOD_ORDER: CuttingMethod[] = ['water', 'soil', 'sphagnum', 'perlite', 'other'];

export const CUTTING_STATUSES: Record<CuttingStatus, string> = {
  rooting: 'En cours',
  rooted: 'Racines',
  potted: 'Rempotée',
  failed: 'Ratée',
};

export const CUTTING_STATUS_ORDER: CuttingStatus[] = ['rooting', 'rooted', 'potted', 'failed'];

/** Still growing its roots, or ready to pot. */
export function isGrowing(cutting: Pick<Cutting, 'status'>): boolean {
  return cutting.status === 'rooting' || cutting.status === 'rooted';
}

/** Whether « En faire une plante » applies: rooted or potted, and not a plant yet. */
export function canBecomePlant(cutting: Pick<Cutting, 'status' | 'plant_id'>): boolean {
  return (cutting.status === 'rooted' || cutting.status === 'potted') && !cutting.plant_id;
}

export type CuttingGroups = { growing: Cutting[]; potted: Cutting[]; failed: Cutting[] };

/** Growing ones first, oldest first (the next to root); the others, most recent first. */
export function groupCuttings(cuttings: Cutting[]): CuttingGroups {
  const recent = [...cuttings].sort(
    (a, b) => b.started_on.localeCompare(a.started_on) || b.created_at.localeCompare(a.created_at),
  );
  return {
    growing: recent.filter(isGrowing).reverse(),
    potted: recent.filter((c) => c.status === 'potted'),
    failed: recent.filter((c) => c.status === 'failed'),
  };
}

/** "Bouture de Monstre", else its species, else "Bouture". */
export function cuttingTitle(cutting: Pick<Cutting, 'species'>, parentName?: string | null): string {
  if (parentName) return `Bouture de ${parentName}`;
  const species = cutting.species?.trim();
  return species ? species.charAt(0).toUpperCase() + species.slice(1) : 'Bouture';
}

/** "3 semaines", or "aujourd’hui" when started today. */
function age(startedOn: string, today: string): string {
  return daysBetween(startedOn, today) <= 0 ? 'aujourd’hui' : formatElapsed(startedOn, today);
}

/** "Dans l’eau depuis 3 semaines", "Racines, bouturée il y a 2 mois", "Rempotée"… */
export function cuttingProgress(cutting: Pick<Cutting, 'status' | 'method' | 'started_on'>, today: string): string {
  const since = age(cutting.started_on, today);
  const ago = since === 'aujourd’hui' ? since : `il y a ${since}`;
  switch (cutting.status) {
    case 'rooting': {
      const where = CUTTING_METHODS[cutting.method]?.in;
      if (since === 'aujourd’hui') return where ? `Mise ${where} aujourd’hui` : 'Commencée aujourd’hui';
      return where ? `${where.charAt(0).toUpperCase()}${where.slice(1)} depuis ${since}` : `En cours depuis ${since}`;
    }
    case 'rooted':
      return `Racines, bouturée ${ago}`;
    case 'potted':
      return 'Rempotée';
    case 'failed':
      return 'Ratée';
  }
}

/** The note of the plant it becomes: "Bouture de Monstre, commencée le 3 mai dans l’eau." */
export function cuttingOriginNote(
  cutting: Pick<Cutting, 'species' | 'method' | 'started_on'>,
  parentName?: string | null,
): string {
  const where = CUTTING_METHODS[cutting.method]?.in;
  const started = `commencée le ${formatShortDate(cutting.started_on)}${where ? ` ${where}` : ''}`;
  return parentName ? `Bouture de ${parentName}, ${started}.` : `Issue d’une bouture ${started}.`;
}
