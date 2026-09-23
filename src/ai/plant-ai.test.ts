import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ai, type GenerateRequest } from '@/ai';
import { getPlant, getRoom, getSpeciesSheet, listPlantEvents, listPlantTasks } from '@/db/repo';
import type { Plant, Task } from '@/db/types';
import { isSheetComplete, SHEET_TEXTS_SCHEMA, validateCareSheet } from '@/lib/care-sheet';
import { DIAGNOSIS_SCHEMA } from '@/lib/diagnosis';
import { EMPTY_FINDINGS, validateIdentification } from '@/lib/identification';
import { getReference } from '@/lib/plant-reference';

import { fakeEngine } from './fake-engine';
import { EXPERT_SYSTEM } from './plant-context';
import {
  askPlant,
  diagnosePlant,
  extractJson,
  generateCareSheet,
  identifyPlant,
  isAbortError,
  MAX_HISTORY_TURNS,
  MAX_RETRIES,
  MAX_TURN_LENGTH,
  type ChatTurn,
} from './plant-ai';

jest.mock('@/ai', () => ({ ai: { generate: jest.fn() } }));
jest.mock('@/db/repo', () => ({
  getPlant: jest.fn(),
  getRoom: jest.fn(),
  getSpeciesSheet: jest.fn(),
  listPlantEvents: jest.fn(),
  listPlantTasks: jest.fn(),
}));

const generate = jest.mocked(ai.generate);

/** A plant of the database, as the repo reads it (sheet, room and journal left empty). */
const plant: Plant = {
  id: 'p1',
  place_id: 'home',
  room_id: null,
  nickname: 'Monty',
  species: 'Monstera deliciosa',
  species_sheet_id: null,
  acquired_on: null,
  pot: null,
  substrate: null,
  notes: null,
  main_photo_id: null,
  main_photo_uri: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
};

const waterTask: Task = {
  id: 't1',
  plant_id: 'p1',
  kind: 'water',
  label: null,
  interval_days: 7,
  winter_factor: 1.5,
  last_done_at: null,
  next_due_on: '2099-01-01',
  wet_streak: 2,
  wet_days: 4,
  suggested_interval_days: 11,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
};

const identification = {
  is_plant: true,
  candidates: [
    { scientific_name: 'Epipremnum aureum', common_name: 'Pothos', confidence: 0.2 },
    { scientific_name: 'Monstera deliciosa', common_name: 'Faux philodendron', confidence: 0.7 },
  ],
  photo: {
    pot: { material: 'plastic', diameter_cm: 14 },
    repot: { needed: 'yes', reason: 'Racines sur la terre.' },
    observations: ['Feuilles du bas jaunies'],
  },
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
  repotting: { interval_days: 730, advice: 'Au printemps, dans un pot un peu plus large.' },
  substrate: 'Terreau pour plantes vertes et écorce de pin.',
  pot: 'Pot percé et lourd.',
  propagation: 'Bouture une tige avec un nœud.',
  problems: [{ symptom: 'Feuilles jaunes', cause: 'Trop d’eau', fix: 'Espace les arrosages.' }],
  tips: ['Donne-lui un tuteur.', 'Dépoussière les feuilles.'],
};

/** Texts the model writes for a species of the reference base. */
const texts = {
  watering_advice: 'Laisse sécher le dessus du terreau entre deux arrosages.',
  repotting_advice: 'Au printemps, dans un pot un peu plus large.',
  substrate: 'Terreau pour plantes vertes et écorce de pin.',
  pot: 'Pot percé et lourd.',
  propagation: 'Bouture une tige avec un nœud.',
  problems: [{ symptom: 'Feuilles jaunes', cause: 'Trop d’eau', fix: 'Espace les arrosages.' }],
  tips: ['Donne-lui un tuteur.', 'Dépoussière les feuilles.'],
};

/** A species the reference base does not know: the model writes the whole sheet. */
const unknownSpecies = { scientificName: 'Ctenanthe burle-marxii', commonName: 'Ctenanthe' };

beforeEach(() => {
  generate.mockReset();
  jest.mocked(getPlant).mockReturnValue(plant);
  jest.mocked(getRoom).mockReturnValue(null);
  jest.mocked(getSpeciesSheet).mockReturnValue(null);
  jest.mocked(listPlantTasks).mockReturnValue([waterTask]);
  jest.mocked(listPlantEvents).mockReturnValue([]);
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
      jsonSchema: expect.objectContaining({ required: ['is_plant', 'candidates', 'photo'] }),
      maxTokens: 600,
    });
    // Changing the temperature would reload the model.
    expect(generate.mock.calls[0][0]).not.toHaveProperty('temperature');
    // The shared expert, asked for JSON.
    expect(generate.mock.calls[0][0].system).toContain(EXPERT_SYSTEM);
    expect(generate.mock.calls[0][0].system).toContain('uniquement avec un objet JSON');
  });

  it('links the candidates to the reference base', async () => {
    generate.mockResolvedValueOnce(
      JSON.stringify({
        ...identification,
        candidates: [
          { scientific_name: 'Sansevieria trifasciata', common_name: 'Snake plant', confidence: 0.8 },
          { scientific_name: 'Ctenanthe burle-marxii', common_name: 'Ctenanthe', confidence: 0.1 },
        ],
      }),
    );
    const result = await identifyPlant('file:///photo.jpg');
    expect(result.candidates).toEqual([
      {
        scientific_name: 'Dracaena trifasciata',
        common_name: 'Sansevieria',
        confidence: 0.8,
        reference_id: 'dracaena-trifasciata',
      },
      { scientific_name: 'Ctenanthe burle-marxii', common_name: 'Ctenanthe', confidence: 0.1, reference_id: null },
    ]);
  });

  it('asks in the same run what the photo shows of the pot and the plant', async () => {
    generate.mockResolvedValueOnce(JSON.stringify(identification));
    const result = await identifyPlant('file:///photo.jpg');
    expect(result.photo).toEqual(identification.photo);
    const prompt = generate.mock.calls[0][0].prompt;
    for (const field of ['pot.material', 'pot.diameter_cm', 'repot.needed', 'repot.reason', 'observations']) {
      expect(prompt).toContain(`- ${field} : `);
    }
  });

  it('does not ask again for garbled photo findings', async () => {
    generate.mockResolvedValueOnce(
      JSON.stringify({ ...identification, photo: { pot: 'grand', repot: { needed: 'peut-être' }, observations: 3 } }),
    );
    const result = await identifyPlant('file:///photo.jpg');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.candidates).toHaveLength(2);
    expect(result.photo).toEqual(EMPTY_FINDINGS);
  });

  it('asks again for the species only', async () => {
    generate
      .mockResolvedValueOnce(JSON.stringify({ ...identification, candidates: [{ scientific_name: 'Monstera' }] }))
      .mockResolvedValueOnce(JSON.stringify(identification));
    await identifyPlant('file:///photo.jpg');
    const errors = generate.mock.calls[1][0].prompt.split('Problèmes :')[1];
    expect(errors).toContain('- candidates[0].common_name');
    expect(errors).not.toContain('photo');
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

describe('writing the sheet of a species the base does not know', () => {
  it('keeps the names the user confirmed', async () => {
    generate.mockResolvedValueOnce('```json\n' + JSON.stringify(sheet) + '\n```');
    const result = await generateCareSheet({
      scientificName: 'Ctenanthe burle-marxii',
      commonName: 'Ctenanthe de Burle Marx',
    });
    expect(result.scientific_name).toBe('Ctenanthe burle-marxii');
    expect(result.common_name).toBe('Ctenanthe de Burle Marx');
    expect(result.reference_id).toBeNull();
    expect(generate.mock.calls[0][0].prompt).toContain(
      '« Ctenanthe burle-marxii » (nom commun : Ctenanthe de Burle Marx)',
    );
  });

  it('lets the model name a species the user typed', async () => {
    generate.mockResolvedValueOnce(
      JSON.stringify({ ...sheet, scientific_name: 'Ctenanthe burle-marxii', common_name: 'Ctenanthe' }),
    );
    const result = await generateCareSheet({ scientificName: 'ctenanthe', commonName: null });
    expect(result.scientific_name).toBe('Ctenanthe burle-marxii');
    expect(result.common_name).toBe('Ctenanthe');
  });

  it('asks for the pot, the substrate, the problems and the rest', async () => {
    generate.mockResolvedValueOnce(JSON.stringify(sheet));
    const result = await generateCareSheet(unknownSpecies);
    expect(result).toMatchObject({ substrate: sheet.substrate, pot: sheet.pot, problems: sheet.problems });
    const request = generate.mock.calls[0][0];
    expect(request).toMatchObject({
      maxTokens: 1400,
      jsonSchema: expect.objectContaining({
        required: expect.arrayContaining(['substrate', 'pot', 'propagation', 'problems']),
      }),
    });
    expect(request).not.toHaveProperty('temperature');
    for (const field of ['repotting', 'substrate', 'pot', 'propagation', 'problems', 'tips']) {
      expect(request.prompt).toContain(`- ${field} : `);
    }
    expect(request.system).toContain('en tutoyant');
  });

  it('asks again for a sheet without the new fields', async () => {
    const { substrate, pot, problems, ...older } = sheet;
    generate
      .mockResolvedValueOnce(JSON.stringify({ ...older, repotting: { interval_days: 730 } }))
      .mockResolvedValueOnce(JSON.stringify({ ...sheet, substrate: '…' }))
      .mockResolvedValueOnce(JSON.stringify(sheet));
    const result = await generateCareSheet(unknownSpecies);
    expect(isSheetComplete(result)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(3);
    const secondPrompt = generate.mock.calls[1][0].prompt;
    expect(secondPrompt).toContain('- repotting.advice : texte non vide attendu (reçu : absent)');
    expect(secondPrompt).toContain('- substrate : texte non vide attendu (reçu : absent)');
    expect(secondPrompt).toContain('- problems : entre 1 et 3 problèmes attendus');
    expect(generate.mock.calls[2][0].prompt).toContain('- substrate : texte non vide attendu (reçu : "…")');
  });

  it('retries a sheet with out-of-range intervals', async () => {
    generate
      .mockResolvedValueOnce(JSON.stringify({ ...sheet, fertilizing: { interval_days: 0 } }))
      .mockResolvedValueOnce(JSON.stringify(sheet));
    const result = await generateCareSheet(unknownSpecies);
    expect(result.fertilizing.interval_days).toBe(14);
    expect(generate.mock.calls[1][0].prompt).toContain('fertilizing.interval_days : entier entre 1 et 730');
  });
});

describe('writing the sheet of a species of the reference base', () => {
  it('takes the figures from the base and asks the model for the texts only', async () => {
    generate.mockResolvedValueOnce(JSON.stringify(texts));
    const result = await generateCareSheet({ scientificName: 'Monstera deliciosa', commonName: 'Monstera' });
    const reference = getReference('monstera-deliciosa')!;
    expect(result).toMatchObject({
      common_name: 'Monstera',
      scientific_name: 'Monstera deliciosa',
      light: reference.light,
      watering: { ...reference.watering, advice: texts.watering_advice },
      temperature: reference.temperature,
      toxicity: reference.toxicity,
      fertilizing: { interval_days: reference.fertilizing_interval_days },
      misting: null,
      repotting: { interval_days: reference.repotting_interval_days, advice: texts.repotting_advice },
      substrate: texts.substrate,
      problems: texts.problems,
      reference_id: 'monstera-deliciosa',
    });

    const request = generate.mock.calls[0][0];
    expect(request.jsonSchema).toBe(SHEET_TEXTS_SCHEMA);
    // A shorter answer than a whole sheet.
    expect(request.maxTokens).toBeLessThan(1400);
    expect(request).not.toHaveProperty('temperature');
    expect(request.prompt).toContain('« Monstera deliciosa » (Monstera)');
    expect(request.prompt).toContain('Données vérifiées pour Monstera deliciosa');
    expect(request.prompt).toContain('- arrosage : tous les 7 jours');
    expect(request.prompt).toContain('n’écris pas d’autres chiffres');
  });

  it('finds the species from a synonym or a common name the user typed', async () => {
    generate.mockResolvedValueOnce(JSON.stringify(texts));
    const result = await generateCareSheet({ scientificName: 'langue de belle-mère', commonName: null });
    expect(result).toMatchObject({
      scientific_name: 'Dracaena trifasciata',
      common_name: 'Sansevieria',
      watering: { interval_days: 21, winter_factor: 2 },
      reference_id: 'dracaena-trifasciata',
    });
  });

  it('asks again for missing texts', async () => {
    generate
      .mockResolvedValueOnce(JSON.stringify({ ...texts, pot: '', watering_advice: undefined }))
      .mockResolvedValueOnce(JSON.stringify(texts));
    const result = await generateCareSheet({ scientificName: 'Epipremnum aureum', commonName: 'Pothos' });
    expect(result.pot).toBe(texts.pot);
    const errors = generate.mock.calls[1][0].prompt.split('Problèmes :')[1];
    expect(errors).toContain('- watering_advice : texte non vide attendu (reçu : absent)');
    expect(errors).toContain('- pot : texte non vide attendu (reçu : "")');
  });
});

const diagnosis = {
  problems: [
    {
      name: 'Excès d’arrosage',
      kind: 'care',
      confidence: 0.7,
      signs: 'Feuilles jaunes et terreau encore humide.',
      actions: ['Laisse sécher le terreau.'],
    },
  ],
  status: 'treat',
  summary: 'Sans doute trop d’eau.',
  watering_change: 'less',
  light_change: 'none',
};

describe('diagnosing a plant', () => {
  it('sends the photo and what the app knows of the plant in the same run', async () => {
    generate.mockResolvedValueOnce(JSON.stringify(diagnosis));
    const result = await diagnosePlant('file:///leaf.jpg', 'p1');
    expect(result).toEqual(diagnosis);
    expect(generate).toHaveBeenCalledTimes(1);

    const request = generate.mock.calls[0][0];
    expect(request).toMatchObject({ imageUri: 'file:///leaf.jpg', jsonSchema: DIAGNOSIS_SCHEMA });
    expect(request).not.toHaveProperty('temperature');
    expect(request.system).toContain(EXPERT_SYSTEM);
    expect(request.prompt).toContain('Plante : « Monty », Faux philodendron (Monstera deliciosa).');
    expect(request.prompt).toContain('Terreau encore humide 2 fois de suite');
    // Too much water or too little, from the watering history.
    expect(request.prompt).toContain('Trop d’eau ou pas assez ?');
    expect(request.prompt).toContain('« terreau encore humide »');
    for (const field of ['name', 'kind', 'confidence', 'signs', 'actions', 'status', 'summary', 'watering_change', 'light_change']) {
      expect(request.prompt).toContain(`- ${field} : `);
    }
  });

  it('asks again until every problem is complete', async () => {
    generate
      .mockResolvedValueOnce(JSON.stringify({ ...diagnosis, problems: [{ ...diagnosis.problems[0], actions: [] }] }))
      .mockResolvedValueOnce(JSON.stringify(diagnosis));
    const result = await diagnosePlant('file:///leaf.jpg', 'p1');
    expect(result.problems[0].actions).toEqual(['Laisse sécher le terreau.']);
    expect(generate.mock.calls[1][0].prompt).toContain('- problems[0].actions : entre 1 et 3 actions attendues');
  });

  it('gives up with a French message after the retries', async () => {
    generate.mockResolvedValue('{"status": "treat"}');
    await expect(diagnosePlant('file:///leaf.jpg', 'p1')).rejects.toThrow('Le modèle n’a pas réussi à analyser cette photo');
    expect(generate).toHaveBeenCalledTimes(1 + MAX_RETRIES);
  });

  it('says so when the plant is gone, without running the model', async () => {
    jest.mocked(getPlant).mockReturnValue(null);
    await expect(diagnosePlant('file:///leaf.jpg', 'gone')).rejects.toThrow('Cette plante n’existe plus.');
    expect(generate).not.toHaveBeenCalled();
  });
});

describe('asking about a plant', () => {
  /** Nine turns, the oldest first; the fourth is very long. */
  const history: ChatTurn[] = Array.from({ length: 9 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    text: i === 4 ? `Message 4 ${'très long '.repeat(100)}` : `Message ${i}`,
  }));

  it('streams a short plain-text answer with onText', async () => {
    generate.mockImplementationOnce(async (request: GenerateRequest) => {
      request.onText?.('**Arrose');
      request.onText?.('**Arrose** quand le terreau est sec.');
      return 'Plantule : **Arrose** quand le terreau est sec.';
    });
    const onText = jest.fn();
    const answer = await askPlant('p1', [], 'Quand l’arroser ?', { onText });
    expect(answer).toBe('Arrose quand le terreau est sec.');
    expect(onText.mock.calls.map(([text]) => text)).toEqual(['Arrose', 'Arrose quand le terreau est sec.']);

    const request = generate.mock.calls[0][0];
    // Free text: the shared expert without the JSON instruction, and no schema.
    expect(request.system).toBe(EXPERT_SYSTEM);
    expect(request).not.toHaveProperty('jsonSchema');
    expect(request).not.toHaveProperty('temperature');
    expect(request.maxTokens).toBeLessThanOrEqual(400);
    expect(request.prompt).toContain('Plante : « Monty »');
    expect(request.prompt).toMatch(/Question : Quand l’arroser \?\n/);
    expect(request.prompt).not.toContain('Conversation jusqu’ici');
  });

  it('gives back the last 6 messages, shortened', async () => {
    generate.mockResolvedValueOnce('Oui.');
    await askPlant('p1', history, 'Et maintenant ?');
    const prompt = generate.mock.calls[0][0].prompt;
    const conversation = prompt.split('Conversation jusqu’ici :\n')[1].split('\n\nQuestion')[0].split('\n');
    expect(conversation).toHaveLength(MAX_HISTORY_TURNS);
    expect(conversation[0]).toBe('Plantule : Message 3');
    expect(conversation[1]).toMatch(/^Utilisateur : Message 4 très long/);
    expect(conversation[1].length).toBeLessThanOrEqual('Utilisateur : '.length + MAX_TURN_LENGTH);
    expect(conversation[1]).toMatch(/…$/);
    expect(conversation[5]).toBe('Utilisateur : Message 8');
    expect(prompt).not.toContain('Message 2');
  });

  it('leaves out the question when the screen already saved it', async () => {
    generate.mockResolvedValueOnce('Oui.');
    await askPlant('p1', [...history, { role: 'user', text: 'Et maintenant ?' }], 'Et maintenant ?');
    const prompt = generate.mock.calls[0][0].prompt;
    expect(prompt.match(/Et maintenant \?/g)).toHaveLength(1);
    expect(prompt).toContain('Utilisateur : Message 8\n\nQuestion : Et maintenant ?');
  });

  it('stops when cancelled, and never asks again by itself', async () => {
    const controller = new AbortController();
    generate.mockImplementationOnce(async () => {
      controller.abort();
      throw new Error('interrupted');
    });
    const error = await askPlant('p1', [], 'Pourquoi ?', { signal: controller.signal }).catch((e) => e);
    expect(isAbortError(error)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('says so when the model answers nothing, or the question is empty', async () => {
    generate.mockResolvedValueOnce('  **  ');
    await expect(askPlant('p1', [], 'Pourquoi ?')).rejects.toThrow('Reformule ta question');
    await expect(askPlant('p1', [], '   ')).rejects.toThrow('Écris ta question.');
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('the pretend model', () => {
  async function ask(request: GenerateRequest) {
    jest.useFakeTimers();
    try {
      const answer = fakeEngine.generate(request);
      await jest.advanceTimersByTimeAsync(60_000);
      return await answer;
    } finally {
      jest.useRealTimers();
    }
  }

  afterEach(() => {
    jest.useRealTimers();
  });

  it('answers in the expected formats', async () => {
    const identification = validateIdentification(extractJson(await ask({ prompt: '…', imageUri: 'file:///a.jpg' })));
    expect(identification.ok).toBe(true);
    if (!identification.ok) return;
    expect(identification.value.candidates).toHaveLength(3);
    expect(identification.value.photo).toEqual({
      pot: { material: 'terracotta', diameter_cm: 17 },
      repot: { needed: 'yes', reason: expect.any(String) },
      observations: [expect.any(String), expect.any(String)],
    });
    expect(identification.value.photo.repot.reason).not.toBe('');

    const names = ['Monstera deliciosa', 'Thaumatophyllum bipinnatifidum', 'Rhaphidophora tetrasperma', 'Pothos'];
    for (const name of names) {
      const answer = await ask({ prompt: `Rédige la fiche de la plante « ${name} ».` });
      const result = validateCareSheet(extractJson(answer), { strict: true });
      expect(result.ok && result.value.scientific_name).toBe(name);
      expect(result.ok && isSheetComplete(result.value)).toBe(true);
    }
  });

  it('fills the sheet of a known species from the base', async () => {
    generate.mockImplementation(ask);
    const result = await generateCareSheet({ scientificName: 'Monstera deliciosa', commonName: 'Faux philodendron' });
    expect(result.reference_id).toBe('monstera-deliciosa');
    expect(result.watering.interval_days).toBe(getReference('monstera-deliciosa')!.watering.interval_days);
    expect(isSheetComplete(result)).toBe(true);
    const unknown = await generateCareSheet({ scientificName: 'Plantus inventus', commonName: null });
    expect(unknown.reference_id).toBeNull();
    expect(isSheetComplete(unknown)).toBe(true);
  });

  it('diagnoses in turn a plant to treat, to watch and a healthy one', async () => {
    generate.mockImplementation(ask);
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await diagnosePlant('file:///leaf.jpg', 'p1'));
    expect(results.map((r) => r.status).sort()).toEqual(['healthy', 'treat', 'watch']);
    expect(results.find((r) => r.status === 'treat')?.watering_change).toBe('less');
  });

  it('writes its answers to questions word by word', async () => {
    generate.mockImplementation(ask);
    const onText = jest.fn();
    const answer = await askPlant('p1', [], 'Pourquoi ses feuilles jaunissent ?', { onText });
    expect(answer).toMatch(/^Des feuilles qui jaunissent/);
    const texts = onText.mock.calls.map(([text]) => text as string);
    expect(texts.length).toBeGreaterThan(10);
    texts.forEach((text, i) => i > 0 && expect(text.startsWith(texts[i - 1])).toBe(true));
    expect(texts.at(-1)).toBe(answer);
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await fakeEngine.generate({ prompt: '…', signal: controller.signal }).catch((e) => e);
    expect(isAbortError(error)).toBe(true);
  });
});
