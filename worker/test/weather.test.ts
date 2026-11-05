import { describe, expect, it } from 'vitest';

import {
  assessDay,
  candidatesForDay,
  classifySetting,
  swapOutdoorSlots,
  type SwappableSlot,
} from '../src/pipeline/weather';
import { place, weather } from './fixtures';

describe('assessDay', () => {
  it('a mild clear day is fine', () => {
    expect(assessDay(weather())).toEqual({ bad: false, reasons: [] });
  });

  it.each([
    ['thunderstorms', { weatherCode: 95 }, 'Thunderstorms forecast'],
    ['heavy rain total', { precipitationMm: 12 }, 'Heavy rain forecast (12 mm)'],
    ['likely moderate rain', { precipitationMm: 4, precipitationProbability: 85 }, 'Heavy rain'],
    ['extreme heat', { tempMaxC: 38 }, 'Extreme heat (38°C)'],
    ['extreme cold', { tempMaxC: -8 }, 'Extreme cold (-8°C)'],
    ['strong wind', { windMaxKmh: 62 }, 'Strong wind (62 km/h)'],
    ['heavy snow', { weatherCode: 75 }, 'Heavy snow forecast'],
  ])('%s is bad weather', (_name, overrides, reason) => {
    const r = assessDay(weather(overrides));
    expect(r.bad).toBe(true);
    expect(r.reasons.join(' ')).toContain(reason);
  });

  it('light, unlikely rain is not bad', () => {
    expect(assessDay(weather({ precipitationMm: 4, precipitationProbability: 30 })).bad).toBe(
      false,
    );
  });

  it('never swaps on "typical weather" (historical averages)', () => {
    expect(
      assessDay(weather({ source: 'typical', weatherCode: 95, precipitationMm: 20 })).bad,
    ).toBe(false);
  });
});

describe('classifySetting', () => {
  it.each([
    [{ tourism: 'museum' }, 'indoor'],
    [{ amenity: 'theatre' }, 'indoor'],
    [{ leisure: 'park' }, 'outdoor'],
    [{ tourism: 'viewpoint' }, 'outdoor'],
    [{ natural: 'beach' }, 'outdoor'],
    [{ historic: 'castle' }, 'mixed'],
    [{ tourism: 'attraction' }, 'mixed'],
    [{ name: 'Something' }, 'unknown'],
    [{ leisure: 'park', indoor: 'yes' }, 'indoor'],
  ])('%j -> %s', (tags, expected) => {
    expect(classifySetting({ kind: 'attraction', tags })).toBe(expected);
  });

  it('treats restaurants, cafés and hotels as indoor', () => {
    expect(classifySetting({ kind: 'restaurant', tags: { outdoor_seating: 'yes' } })).toBe(
      'indoor',
    );
  });
});

describe('candidatesForDay', () => {
  const park = place('attraction', 'Park', 100, { leisure: 'park' });
  const museum = place('attraction', 'Museum', 200, { tourism: 'museum' });
  const castle = place('attraction', 'Castle', 300, { historic: 'castle' });

  it('keeps everything on a good day', () => {
    expect(candidatesForDay([park, museum], weather()).removed).toEqual([]);
  });

  it('removes only clearly outdoor places on a bad day, with the reason', () => {
    const r = candidatesForDay([park, museum, castle], weather({ weatherCode: 95 }));
    expect(r.allowed.map((p) => p.name)).toEqual(['Museum', 'Castle']);
    expect(r.removed).toEqual([{ id: park.id, reason: 'Thunderstorms forecast' }]);
  });

  it('keeps everything when there is no weather data', () => {
    expect(candidatesForDay([park], null).allowed).toHaveLength(1);
  });
});

describe('swapOutdoorSlots', () => {
  const park = place('attraction', 'Park', 0, { leisure: 'park' });
  const nearMuseum = place('attraction', 'Near museum', 300, { tourism: 'museum' });
  const farMuseum = place('attraction', 'Far museum', 3000, { tourism: 'museum' });
  const closedGallery = place('attraction', 'Closed gallery', 100, { tourism: 'gallery' });
  const lunch = place('restaurant', 'Lunch spot', 50);
  const pool = [park, nearMuseum, farMuseum, closedGallery, lunch];

  const slots: SwappableSlot[] = [
    {
      id: 's1',
      kind: 'activity',
      date: '2026-12-10',
      start: '10:00',
      end: '12:00',
      placeId: park.id,
    },
    { id: 's2', kind: 'meal', date: '2026-12-10', start: '12:30', end: '13:30', placeId: lunch.id },
  ];
  const isAvailable = (p: { id: string }) => p.id !== closedGallery.id;

  it('swaps outdoor activities for the nearest open indoor place on a bad day', () => {
    const r = swapOutdoorSlots(slots, weather({ precipitationMm: 15 }), pool, {
      usedIds: new Set(),
      isAvailable,
    });
    expect(r.slots[0]!.placeId).toBe(nearMuseum.id); // closed gallery is skipped
    expect(r.slots[1]).toEqual(slots[1]); // meals are never swapped
    expect(r.swaps).toEqual([
      { slotId: 's1', fromId: park.id, toId: nearMuseum.id, reason: 'Heavy rain forecast (15 mm)' },
    ]);
  });

  it('does not reuse places already in the trip', () => {
    const r = swapOutdoorSlots(slots, weather({ weatherCode: 95 }), pool, {
      usedIds: new Set([nearMuseum.id]),
      isAvailable,
    });
    expect(r.slots[0]!.placeId).toBe(farMuseum.id);
  });

  it('keeps the original and reports it when no indoor option exists', () => {
    const r = swapOutdoorSlots(slots, weather({ weatherCode: 95 }), [park, lunch], {
      usedIds: new Set(),
      isAvailable,
    });
    expect(r.slots[0]!.placeId).toBe(park.id);
    expect(r.swaps[0]!.toId).toBeNull();
  });

  it('changes nothing on a good day', () => {
    const r = swapOutdoorSlots(slots, weather(), pool, { usedIds: new Set(), isAvailable });
    expect(r).toEqual({ slots, swaps: [] });
  });
});
