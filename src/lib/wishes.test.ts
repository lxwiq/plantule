import { describe, expect, it } from '@jest/globals';

import { getReference } from './plant-reference';
import { wishFacts, wishSummary } from './wishes';

describe('wishlist facts', () => {
  it('says the light, the watering and the danger for pets', () => {
    expect(wishFacts(getReference('monstera-deliciosa')!)).toEqual({
      light: 'Lumineux, sans soleil direct',
      watering: 'Toutes les semaines, ×1,5 en hiver',
      toxicity: 'Toxique pour les chats et les chiens',
      toxic: true,
    });
  });

  it('reads a species sheet the same way', () => {
    const facts = wishFacts({
      light: 'full_sun',
      watering: { interval_days: 14, winter_factor: 1 },
      toxicity: { cats: 'non_toxic', dogs: 'unknown' },
    });
    expect(facts).toEqual({
      light: 'Plein soleil',
      watering: 'Toutes les 2 semaines',
      toxicity: 'Sans danger pour les chats, toxicité inconnue pour les chiens',
      toxic: false,
    });
  });

  it('sums them up for a list', () => {
    expect(wishSummary(getReference('monstera-deliciosa')!)).toBe(
      'Lumineux, sans soleil direct · arrosage toutes les semaines · toxique pour les chats et les chiens',
    );
  });
});
