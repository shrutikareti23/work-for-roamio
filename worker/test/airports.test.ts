import { describe, expect, it } from 'vitest';

import {
  airportLabel,
  findAirport,
  nearestAirports,
  normalizeCity,
} from '../src/pipeline/airports';

const code = (query: string, extra: Partial<Parameters<typeof findAirport>[0]> = {}) =>
  findAirport({ query, ...extra })?.airport.iata ?? null;

describe('findAirport', () => {
  it.each([
    ['Chicago', 'ORD'],
    ['Lisbon', 'LIS'],
    ['Lisbon, Portugal', 'LIS'],
    ['lisboa', 'LIS'],
    ['New York', 'JFK'],
    ['NYC', 'JFK'],
    ['London', 'LHR'],
    ['Paris', 'CDG'],
    ['Delhi', 'DEL'],
    ['Bangalore', 'BLR'],
    ['São Paulo', 'GRU'],
    ['Sao Paulo', 'GRU'],
    ['Tokyo', 'HND'],
  ])('%s -> %s', (query, expected) => {
    expect(code(query)).toBe(expected);
  });

  it('accepts airport codes directly, in any case', () => {
    expect(findAirport({ query: 'mdw' })).toMatchObject({
      airport: { iata: 'MDW' },
      match: 'code',
    });
  });

  it('respects the country when given (Paris, Texas is not Paris, France)', () => {
    expect(code('Paris', { countryCode: 'US' })).not.toBe('CDG');
  });

  it('falls back to the nearest airport for small towns when coordinates are known', () => {
    const sintra = { lat: 38.8029, lon: -9.3817 };
    expect(findAirport({ query: 'Sintra', near: sintra })).toMatchObject({
      airport: { iata: 'LIS' },
      match: 'nearest',
    });
  });

  it('returns null instead of guessing', () => {
    expect(findAirport({ query: 'Atlantis' })).toBeNull();
  });
});

describe('helpers', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalizeCity('  São   Paulo! ')).toBe('sao paulo');
  });

  it('nearestAirports lists large airports first within range', () => {
    const porto = { lat: 41.1579, lon: -8.6291 };
    expect(nearestAirports(porto, 50)[0]?.iata).toBe('OPO');
  });

  it('labels as "City (CODE)"', () => {
    const ord = findAirport({ query: 'ORD' })!.airport;
    expect(airportLabel('Chicago, IL', ord)).toBe('Chicago (ORD)');
  });
});
