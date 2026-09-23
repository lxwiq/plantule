/**
 * The wishlist: species I would like to have. For a species the app knows
 * (reference base, or a sheet on the phone), the figures that help decide.
 */

import type { CareSheet } from './care-sheet';
import { toxicityText, winterText } from './care-sheet';
import { formatInterval } from './dates';
import { LIGHT_LABELS } from './labels';
import type { CareFigures } from './plant-reference';
import { capitalize } from './text';

/** What the figures of a species (reference entry or sheet) say to decide. */
export type WishFacts = {
  light: string;
  /** "Tous les 7 jours, ×1,5 en hiver" */
  watering: string;
  /** "Toxique pour les chats et les chiens" */
  toxicity: string;
  /** Toxic for cats or dogs. */
  toxic: boolean;
};

/** A reference entry, or the data of a sheet. */
type Figures = Pick<CareFigures, 'light' | 'toxicity'> & {
  watering: Pick<CareSheet['watering'], 'interval_days' | 'winter_factor'>;
};

export function wishFacts({ light, watering, toxicity }: Figures): WishFacts {
  return {
    light: LIGHT_LABELS[light],
    watering: [capitalize(formatInterval(watering.interval_days)), winterText(watering.winter_factor)]
      .filter(Boolean)
      .join(', '),
    toxicity: toxicityText(toxicity),
    toxic: toxicity.cats === 'toxic' || toxicity.dogs === 'toxic',
  };
}

/** "Plein soleil · arrosage tous les 7 jours · toxique pour les chats et les chiens", for a list. */
export function wishSummary(figures: Figures): string {
  const { light, toxicity } = wishFacts(figures);
  const watering = `arrosage ${formatInterval(figures.watering.interval_days)}`;
  return [light, watering, toxicity.toLowerCase()].join(' · ');
}
