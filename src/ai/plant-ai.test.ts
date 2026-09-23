import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ai } from '@/ai';
import { validateCareSheet } from '@/lib/care-sheet';
import { validateIdentification } from '@/lib/identification';

import { fakeEngine } from './fake-engine';
import { extractJson, generateCareSheet, identifyPlant, isAbortError, MAX_RETRIES } from './plant-ai';

jest.mock('@/ai', () => ({ ai: { generate: jest.fn() } }));

const generate = jest.mocked(ai.generate);

const identification = {
  is_plant: true,
  candidates: [
    { scientific_name: 'Epipremnum aureum', common_name: 'Pothos', confidence: 0.2 },
    { scientific_name: 'Monstera deliciosa', common_name: 'Faux philodendron', confidence: 0.7 },
  ],
};

const sheet = {
  common_name: 'Monstera',
  scientific_name: 'Monstera Deliciosa',
  light: 'bright_indirect',
  watering: { interval_days: 7, winter_factor: 1.5, advice: 'Laisse sécher le dessus du terreau.' },
  humidity: 'medium',
  temperature: { min_c: 15, max_c: 30 },
  toxicity: { cats: 'toxic', dogs: 'toxic' },
  fertilizing: { interval_days: 14 },
  misting: null,
  repotting: { interval_days: 730 },
  tips: ['Donne-lui un tuteur.', 'Dépoussière les feuilles.'],
};

beforeEach(() => {
  generate.mockReset();
});

describe('JSON extraction', () => {
  it('reads a bare object', () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it('ignores code fences and text around the object', () => {
    expect(extractJson('Voici la fiche :\n```json\n{"a": {"b": [1, 2]}}\n```\nBonne culture !')).toEqual({
      a: { b: [1, 2] },
    });
  });

  it('takes the first balanced object, braces in strings included', () => {
    expect(extractJson('{"tip": "Arrose {peu} \\"souvent\\""} puis {"autre": true}')).toEqual({
      tip: 'Arrose {peu} "souvent"',
    });
  });

  it('forgives trailing commas', () => {
    expect(extractJson('{"tips": ["a", "b",], "n": 1,}')).toEqual({ tips: ['a', 'b'], n: 1 });
  });

  it('explains what is wrong otherwise', () => {
    expect(() => extractJson('Je ne sais pas.')).toThrow('aucun objet JSON dans la réponse');
    expect(() => extractJson('{"a": {"b": 1}')).toThrow('objet JSON incomplet');
    expect(() => extractJson('{a: 1}')).toThrow(/^JSON invalide/);
  });
});

describe('identifying a photo', () => {
  it('sends the photo with the schema and returns the candidates, most likely first', async () => {
    generate.mockResolvedValueOnce(JSON.stringify(identification));
    const result = await identifyPlant('file:///photo.jpg');
    expect(result.candidates.map((c) => c.scientific_name)).toEqual(['Monstera deliciosa', 'Epipremnum aureum']);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0]).toMatchObject({
      imageUri: 'file:///photo.jpg',
      jsonSchema: expect.objectContaining({ required: ['is_plant', 'candidates'] }),
    });
    // Changing the temperature would reload the model.
    expect(generate.mock.calls[0][0]).not.toHaveProperty('temperature');
  });

  it('asks again with the problems until the answer fits', async () => {
    generate
      .mockResolvedValueOnce('C’est sûrement un monstera !')
      .mockResolvedValueOnce('{"is_plant": true, "candidates": [{"scientific_name": "Monstera deliciosa"}]}')
      .mockResolvedValueOnce(JSON.stringify(identification));
    const result = await identifyPlant('file:///photo.jpg');
    expect(result.is_plant).toBe(true);
    expect(generate).toHaveBeenCalledTimes(3);

    const secondPrompt = generate.mock.calls[1][0].prompt;
    expect(secondPrompt).toContain('C’est sûrement un monstera !');
    expect(secondPrompt).toContain('- aucun objet JSON dans la réponse');
    const thirdPrompt = generate.mock.calls[2][0].prompt;
    expect(thirdPrompt).toContain('- candidates[0].common_name : texte non vide attendu (reçu : absent)');
    // Each retry starts from the original question, not from the previous retry.
    expect(thirdPrompt).not.toContain('C’est sûrement un monstera !');
  });

  it('gives up with a French message after the retries', async () => {
    generate.mockResolvedValue('{}');
    await expect(identifyPlant('file:///photo.jpg')).rejects.toThrow(
      'Le modèle n’a pas réussi à analyser cette photo',
    );
    expect(generate).toHaveBeenCalledTimes(1 + MAX_RETRIES);
  });

  it('passes on engine errors without retrying', async () => {
    generate.mockRejectedValueOnce(new Error('Pas assez de mémoire.'));
    await expect(identifyPlant('file:///photo.jpg')).rejects.toThrow('Pas assez de mémoire.');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    generate.mockImplementationOnce(async () => {
      controller.abort();
      throw new Error('interrupted');
    });
    const error = await identifyPlant('file:///photo.jpg', { signal: controller.signal }).catch((e) => e);
    expect(isAbortError(error)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);

    const again = await identifyPlant('file:///photo.jpg', { signal: controller.signal }).catch((e) => e);
    expect(isAbortError(again)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('writing a care sheet', () => {
  it('keeps the names the user confirmed', async () => {
    generate.mockResolvedValueOnce('```json\n' + JSON.stringify(sheet) + '\n```');
    const result = await generateCareSheet({
      scientificName: 'Monstera deliciosa',
      commonName: 'Faux philodendron',
    });
    expect(result.scientific_name).toBe('Monstera deliciosa');
    expect(result.common_name).toBe('Faux philodendron');
    expect(generate.mock.calls[0][0].prompt).toContain('« Monstera deliciosa » (nom commun : Faux philodendron)');
  });

  it('lets the model name a species the user typed', async () => {
    generate.mockResolvedValueOnce(
      JSON.stringify({ ...sheet, scientific_name: 'Epipremnum aureum', common_name: 'Pothos' }),
    );
    const result = await generateCareSheet({ scientificName: 'pothos', commonName: null });
    expect(result.scientific_name).toBe('Epipremnum aureum');
    expect(result.common_name).toBe('Pothos');
  });

  it('retries a sheet with out-of-range intervals', async () => {
    generate
      .mockResolvedValueOnce(JSON.stringify({ ...sheet, fertilizing: { interval_days: 0 } }))
      .mockResolvedValueOnce(JSON.stringify(sheet));
    const result = await generateCareSheet({ scientificName: 'Monstera deliciosa', commonName: 'Monstera' });
    expect(result.fertilizing.interval_days).toBe(14);
    expect(generate.mock.calls[1][0].prompt).toContain('fertilizing.interval_days : entier entre 1 et 730');
  });
});

describe('the pretend model', () => {
  async function ask(request: Parameters<typeof fakeEngine.generate>[0]) {
    jest.useFakeTimers();
    try {
      const answer = fakeEngine.generate(request);
      jest.advanceTimersByTime(2000);
      return await answer;
    } finally {
      jest.useRealTimers();
    }
  }

  it('answers in the expected formats', async () => {
    const identification = validateIdentification(extractJson(await ask({ prompt: '…', imageUri: 'file:///a.jpg' })));
    expect(identification.ok && identification.value.candidates).toHaveLength(3);

    for (const name of ['Rhaphidophora tetrasperma', 'Pothos']) {
      const answer = await ask({ prompt: `Rédige la fiche de la plante « ${name} ».` });
      const result = validateCareSheet(extractJson(answer));
      expect(result.ok && result.value.scientific_name).toBe(name);
    }
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await fakeEngine.generate({ prompt: '…', signal: controller.signal }).catch((e) => e);
    expect(isAbortError(error)).toBe(true);
  });
});
