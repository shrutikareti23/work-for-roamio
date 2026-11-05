import type { DayWeather, PlaceCandidate } from '@roamio/shared';

/** Center of Lisbon (Rossio). */
export const CENTER = { lat: 38.7139, lon: -9.1394 };

let nextId = 1;

/** A place `metersNorth` north of CENTER. */
export function place(
  kind: PlaceCandidate['kind'],
  name: string,
  metersNorth: number,
  tags: Record<string, string> = {},
): PlaceCandidate {
  return {
    id: `node/${nextId++}`,
    kind,
    name,
    lat: CENTER.lat + metersNorth / 111_000,
    lon: CENTER.lon,
    tags,
  };
}

export function weather(overrides: Partial<DayWeather> = {}): DayWeather {
  return {
    date: '2026-12-10',
    source: 'forecast',
    weatherCode: 1,
    tempMaxC: 17,
    tempMinC: 10,
    precipitationMm: 0,
    precipitationProbability: 5,
    windMaxKmh: 12,
    ...overrides,
  };
}
