import { describe, expect, it } from '@jest/globals';

import { parseDate } from './dates';
import {
  forecastUrl,
  formatRain,
  geocodingUrl,
  parseForecast,
  parseTowns,
  RAIN_THRESHOLD_MM,
  rainByDay,
  rainExpected,
  rainExpectedText,
  rainWaterings,
  rainWateredText,
  weatherIsStale,
  type RainHour,
  type RainTask,
} from './weather';

const TODAY = '2026-09-23';

/** Epoch ms of a local day and hour. */
function at(day: string, hour: number): number {
  const date = parseDate(day);
  date.setHours(hour);
  return date.getTime();
}

/** Rain of the hour that ends at `hour` on `day`. */
const rain = (day: string, hour: number, mm: number): RainHour => ({ end: at(day, hour), mm });

describe('Open-Meteo requests', () => {
  it('sends only rounded coordinates for the forecast', () => {
    expect(forecastUrl({ latitude: 47.21725, longitude: -1.55336 })).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=47.22&longitude=-1.55&hourly=precipitation' +
        '&past_days=14&forecast_days=2&timezone=auto&timeformat=unixtime',
    );
  });

  it('looks a town up by its name, in French', () => {
    expect(geocodingUrl(' Saint-Étienne ')).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=Saint-%C3%89tienne&count=6&language=fr&format=json',
    );
  });

  it('reads the towns found, with their region', () => {
    const answer = {
      results: [
        { name: 'Nantes', latitude: 47.21725, longitude: -1.55336, admin1: 'Pays de la Loire', admin2: 'Loire-Atlantique', country: 'France' },
        { name: 'Nantes', latitude: 45.6, longitude: -71.1, admin1: 'Québec', country: 'Canada' },
        { name: 'Sans pays', latitude: 1, longitude: 2 },
        { name: '', latitude: 1, longitude: 2 },
        { name: 'Ailleurs', latitude: 'north', longitude: 2 },
        { name: 'Nulle part', latitude: 95, longitude: 2 },
        'Paris',
      ],
    };
    expect(parseTowns(answer)).toEqual([
      { name: 'Nantes', region: 'Loire-Atlantique, France', latitude: 47.21725, longitude: -1.55336 },
      { name: 'Nantes', region: 'Québec, Canada', latitude: 45.6, longitude: -71.1 },
      { name: 'Sans pays', region: null, latitude: 1, longitude: 2 },
    ]);
  });

  it('finds no town in an empty or odd answer', () => {
    for (const answer of [{}, { generationtime_ms: 0.4 }, { results: 'none' }, null, 'oops']) {
      expect(parseTowns(answer)).toEqual([]);
    }
  });

  it('keeps the rainy hours of a forecast', () => {
    const start = at(TODAY, 0) / 1000;
    const answer = {
      hourly: { time: [start, start + 3600, start + 7200, start + 10800], precipitation: [0, 1.2, null, 0.4] },
    };
    expect(parseForecast(answer)).toEqual([
      { end: (start + 3600) * 1000, mm: 1.2 },
      { end: (start + 10800) * 1000, mm: 0.4 },
    ]);
  });

  it('refuses what is not a forecast', () => {
    for (const answer of [
      null,
      {},
      { hourly: { time: [1], precipitation: [] } },
      { hourly: { time: ['2026-09-23T00:00'], precipitation: [1] } },
      { hourly: { time: [1], precipitation: 'none' } },
    ]) {
      expect(parseForecast(answer)).toBeNull();
    }
  });

  it('asks again after a few hours', () => {
    const now = new Date(at(TODAY, 15));
    expect(weatherIsStale(null, now)).toBe(true);
    expect(weatherIsStale(new Date(at(TODAY, 13)).toISOString(), now)).toBe(false);
    expect(weatherIsStale(new Date(at(TODAY, 11)).toISOString(), now)).toBe(true);
    // A clock set back: better ask again.
    expect(weatherIsStale(new Date(at(TODAY, 17)).toISOString(), now)).toBe(true);
  });
});

describe('rain by day', () => {
  it('adds up the rain fallen each local day', () => {
    const hours = [
      rain('2026-09-21', 10, 2.1),
      rain('2026-09-21', 11, 3.2),
      // Ends at midnight: the rain of the last hour of the 21st.
      rain('2026-09-22', 0, 1),
      rain('2026-09-22', 7, 0.5),
    ];
    expect(rainByDay(hours, at(TODAY, 9))).toEqual(
      new Map([
        ['2026-09-21', 6.3],
        ['2026-09-22', 0.5],
      ]),
    );
  });

  it('leaves out the hours that were still a forecast', () => {
    const hours = [rain(TODAY, 8, 2), rain(TODAY, 9, 3), rain(TODAY, 10, 4)];
    expect(rainByDay(hours, at(TODAY, 9))).toEqual(new Map([[TODAY, 5]]));
  });

  it('tells the rain still to come today, from a recent forecast', () => {
    const forecast = {
      fetched_at: new Date(at(TODAY, 7)).toISOString(),
      hours: [rain(TODAY, 8, 9), rain(TODAY, 15, 3), rain(TODAY, 18, 2.5), rain('2026-09-24', 10, 20)],
    };
    expect(rainExpected(forecast, TODAY, new Date(at(TODAY, 9)))).toBe(5.5);
    // Only 2.5 mm left after 16:00.
    expect(rainExpected(forecast, TODAY, new Date(at(TODAY, 16)))).toBeNull();
    // Too old to say anything about today.
    expect(rainExpected(forecast, TODAY, new Date(at(TODAY, 7) + 13 * 3_600_000))).toBeNull();
    expect(rainExpected(null, TODAY)).toBeNull();
  });
});

describe('watering by the rain', () => {
  const water: RainTask = {
    id: 't1',
    plant_id: 'p1',
    kind: 'water',
    outdoor: true,
    interval_days: 5,
    winter_factor: 1.5,
    last_done_at: new Date(at('2026-09-17', 18)).toISOString(),
    next_due_on: '2026-09-22',
    created_at: new Date(at('2026-08-01', 10)).toISOString(),
  };
  const rained = (entries: Record<string, number>) => new Map(Object.entries(entries));

  it('counts a due outdoor watering as done on the rain day', () => {
    expect(rainWaterings([water], rained({ '2026-09-21': 8 }), TODAY)).toEqual([
      { taskId: 't1', plantId: 'p1', day: '2026-09-21', mm: 8, nextDueOn: '2026-09-26' },
    ]);
  });

  it('never touches indoor plants or other care', () => {
    const rain8 = rained({ '2026-09-21': 8 });
    expect(rainWaterings([{ ...water, outdoor: false }], rain8, TODAY)).toEqual([]);
    for (const kind of ['fertilize', 'repot', 'mist'] as const) {
      expect(rainWaterings([{ ...water, kind }], rain8, TODAY)).toEqual([]);
    }
  });

  it('leaves a watering that is not due yet', () => {
    expect(rainWaterings([{ ...water, next_due_on: '2026-09-24' }], rained({ '2026-09-21': 8 }), TODAY)).toEqual([]);
  });

  it('needs a day with enough rain since it was last done', () => {
    expect(rainWaterings([water], rained({ '2026-09-21': RAIN_THRESHOLD_MM - 0.1 }), TODAY)).toEqual([]);
    // Drizzle over several days does not add up.
    expect(rainWaterings([water], rained({ '2026-09-19': 3, '2026-09-20': 3, '2026-09-21': 3 }), TODAY)).toEqual([]);
    // On the day it was last done, the rain may have come before the watering.
    expect(rainWaterings([water], rained({ '2026-09-17': 20, '2026-09-16': 12 }), TODAY)).toEqual([]);
    expect(rainWaterings([water], rained({ '2026-09-19': RAIN_THRESHOLD_MM }), TODAY)).toHaveLength(1);
  });

  it('starts again from the most recent rainy day', () => {
    const waterings = rainWaterings([water], rained({ '2026-09-19': 15, '2026-09-21': 6, '2026-09-22': 2 }), TODAY);
    expect(waterings).toEqual([{ taskId: 't1', plantId: 'p1', day: '2026-09-21', mm: 6, nextDueOn: '2026-09-26' }]);
  });

  it('counts rain fallen today', () => {
    const waterings = rainWaterings([{ ...water, next_due_on: TODAY }], rained({ [TODAY]: 11 }), TODAY);
    expect(waterings).toEqual([{ taskId: 't1', plantId: 'p1', day: TODAY, mm: 11, nextDueOn: '2026-09-28' }]);
  });

  it('ignores a rain too old to spare a watering', () => {
    const late = { ...water, last_done_at: new Date(at('2026-09-10', 9)).toISOString(), next_due_on: '2026-09-15' };
    expect(rainWaterings([late], rained({ '2026-09-12': 20 }), TODAY)).toEqual([]);
    expect(rainWaterings([late], rained({ '2026-09-12': 20, '2026-09-19': 7 }), TODAY)).toEqual([
      { taskId: 't1', plantId: 'p1', day: '2026-09-19', mm: 7, nextDueOn: '2026-09-24' },
    ]);
  });

  it('counts from the day it was created when it was never done', () => {
    const fresh = { ...water, last_done_at: null, next_due_on: '2026-09-21', created_at: new Date(at('2026-09-21', 20)).toISOString() };
    expect(rainWaterings([fresh], rained({ '2026-09-20': 12 }), TODAY)).toEqual([]);
    expect(rainWaterings([fresh], rained({ '2026-09-20': 12, '2026-09-21': 6 }), TODAY)).toEqual([
      { taskId: 't1', plantId: 'p1', day: '2026-09-21', mm: 6, nextDueOn: '2026-09-26' },
    ]);
  });

  it('keeps the winter rhythm', () => {
    const winter = { ...water, last_done_at: new Date(at('2026-12-01', 9)).toISOString(), next_due_on: '2026-12-06' };
    expect(rainWaterings([winter], rained({ '2026-12-05': 9 }), '2026-12-07')).toEqual([
      { taskId: 't1', plantId: 'p1', day: '2026-12-05', mm: 9, nextDueOn: '2026-12-13' },
    ]);
  });

  it('ignores rain after today', () => {
    expect(rainWaterings([water], rained({ '2026-09-24': 30 }), TODAY)).toEqual([]);
  });
});

describe('wording', () => {
  it('rounds the rain to whole millimetres', () => {
    expect(formatRain(8.4)).toBe('8 mm');
    expect(formatRain(12.6)).toBe('13 mm');
    expect(formatRain(0.3)).toBe('1 mm');
  });

  it('says what the rain watered', () => {
    expect(rainWateredText(8.2, '2026-09-22', 3, TODAY)).toBe(
      'Il a plu 8 mm hier : 3 plantes d’extérieur arrosées par la pluie.',
    );
    expect(rainWateredText(12, TODAY, 1, TODAY)).toBe(
      'Il a plu 12 mm aujourd’hui : 1 plante d’extérieur arrosée par la pluie.',
    );
  });

  it('says to wait for the rain', () => {
    expect(rainExpectedText(11.6)).toBe('Environ 12 mm d’ici ce soir : attends avant d’arroser tes plantes d’extérieur.');
  });
});
