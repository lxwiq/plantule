import { describe, expect, it } from '@jest/globals';

import type { Cutting } from '@/db/types';

import {
  canBecomePlant,
  cuttingOriginNote,
  cuttingProgress,
  cuttingTitle,
  groupCuttings,
  isGrowing,
} from './cuttings';

const TODAY = '2026-09-23';

function cutting(overrides: Partial<Cutting> = {}): Cutting {
  return {
    id: 'c1',
    place_id: 'place',
    parent_plant_id: null,
    plant_id: null,
    species: null,
    started_on: '2026-09-02',
    method: 'water',
    status: 'rooting',
    notes: null,
    photo_id: null,
    photo_uri: null,
    photo_taken_at: null,
    created_at: '2026-09-02T10:00:00.000Z',
    updated_at: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('cuttings', () => {
  it('names a cutting after its parent, else its species', () => {
    expect(cuttingTitle(cutting({ species: 'Pothos' }), 'Monstre')).toBe('Bouture de Monstre');
    expect(cuttingTitle(cutting({ species: 'pothos' }))).toBe('Pothos');
    expect(cuttingTitle(cutting({ species: '  ' }), null)).toBe('Bouture');
  });

  it('says where it is at', () => {
    expect(cuttingProgress(cutting(), TODAY)).toBe('Dans l’eau depuis 3 semaines');
    expect(cuttingProgress(cutting({ method: 'soil', started_on: '2026-07-20' }), TODAY)).toBe('En terreau depuis 2 mois');
    expect(cuttingProgress(cutting({ method: 'sphagnum', started_on: TODAY }), TODAY)).toBe('Mise dans la sphaigne aujourd’hui');
    expect(cuttingProgress(cutting({ method: 'other', started_on: '2026-09-20' }), TODAY)).toBe('En cours depuis 3 jours');
    expect(cuttingProgress(cutting({ method: 'other', started_on: TODAY }), TODAY)).toBe('Commencée aujourd’hui');
    expect(cuttingProgress(cutting({ status: 'rooted' }), TODAY)).toBe('Racines, bouturée il y a 3 semaines');
    expect(cuttingProgress(cutting({ status: 'potted' }), TODAY)).toBe('Rempotée');
    expect(cuttingProgress(cutting({ status: 'failed' }), TODAY)).toBe('Ratée');
  });

  it('becomes a plant once rooted or potted, only once', () => {
    expect(canBecomePlant(cutting())).toBe(false);
    expect(canBecomePlant(cutting({ status: 'rooted' }))).toBe(true);
    expect(canBecomePlant(cutting({ status: 'potted' }))).toBe(true);
    expect(canBecomePlant(cutting({ status: 'potted', plant_id: 'p2' }))).toBe(false);
    expect(canBecomePlant(cutting({ status: 'failed' }))).toBe(false);
  });

  it('lists the growing ones first, the oldest first', () => {
    const list = [
      cutting({ id: 'new', started_on: '2026-09-20' }),
      cutting({ id: 'failed', status: 'failed', started_on: '2026-06-01' }),
      cutting({ id: 'old', status: 'rooted', started_on: '2026-08-01' }),
      cutting({ id: 'potted-old', status: 'potted', started_on: '2026-03-01' }),
      cutting({ id: 'potted-new', status: 'potted', started_on: '2026-05-01' }),
    ];
    const groups = groupCuttings(list);
    expect(groups.growing.map((c) => c.id)).toEqual(['old', 'new']);
    expect(groups.potted.map((c) => c.id)).toEqual(['potted-new', 'potted-old']);
    expect(groups.failed.map((c) => c.id)).toEqual(['failed']);
    expect(list.filter(isGrowing)).toHaveLength(2);
  });

  it('tells the plant it becomes where it comes from', () => {
    const note = cuttingOriginNote(cutting({ started_on: '2026-05-03' }), 'Monstre');
    expect(note).toMatch(/^Bouture de Monstre, commencée le 3 mai( 2026)? dans l’eau\.$/);
    const unknown = cuttingOriginNote(cutting({ started_on: '2026-05-03', method: 'other' }));
    expect(unknown).toMatch(/^Issue d’une bouture commencée le 3 mai( 2026)?\.$/);
  });
});
