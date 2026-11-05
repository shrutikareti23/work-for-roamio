import { describe, expect, it } from 'vitest';

import {
  daysBetween,
  findUnknownPlaceIds,
  fromMinutes,
  haversineKm,
  IsoDateSchema,
  ScheduleDraftSchema,
  SlotSchema,
  toMinutes,
  TripProfileSchema,
  walkingMinutes,
} from '../src';

describe('dates', () => {
  it('accepts real dates only', () => {
    expect(IsoDateSchema.safeParse('2026-12-10').success).toBe(true);
    expect(IsoDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(IsoDateSchema.safeParse('10/12/2026').success).toBe(false);
  });

  it('converts times and counts days', () => {
    expect(toMinutes('13:45')).toBe(825);
    expect(fromMinutes(825)).toBe('13:45');
    expect(fromMinutes(1500)).toBe('01:00');
    expect(daysBetween('2026-12-10', '2026-12-15')).toBe(5);
  });
});

describe('geo', () => {
  const lisbon = { lat: 38.7223, lon: -9.1393 };
  const porto = { lat: 41.1579, lon: -8.6291 };
  it('measures distance roughly right (Lisbon–Porto ≈ 274 km)', () => {
    expect(haversineKm(lisbon, porto)).toBeGreaterThan(270);
    expect(haversineKm(lisbon, porto)).toBeLessThan(280);
  });
  it('estimates walking time (1 km ≈ 17 min with detours)', () => {
    expect(walkingMinutes(lisbon, { lat: lisbon.lat + 1 / 111, lon: lisbon.lon })).toBe(17);
  });
});

describe('TripProfileSchema', () => {
  const valid = {
    destinations: ['Lisbon'],
    origin: 'Chicago',
    startDate: '2026-12-10',
    endDate: '2026-12-15',
    travelers: [{ name: 'Shrutika', diet: ['vegetarian'] }],
  };

  it('fills in sensible defaults', () => {
    const t = TripProfileSchema.parse(valid);
    expect(t.restrictions).toEqual({
      mobility: 'none',
      budget: 'medium',
      pace: 'balanced',
      transport: 'walk',
      notes: '',
    });
    expect(t.travelers[0]).toMatchObject({ interests: [], allergies: [], isChild: false });
  });

  it('rejects an end date before the start date', () => {
    const r = TripProfileSchema.safeParse({ ...valid, endDate: '2026-12-01' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown diet values', () => {
    const r = TripProfileSchema.safeParse({
      ...valid,
      travelers: [{ name: 'A', diet: ['carnivore'] }],
    });
    expect(r.success).toBe(false);
  });
});

describe('itinerary schemas', () => {
  const slot = {
    id: 's1',
    kind: 'meal',
    meal: 'lunch',
    start: '12:30',
    end: '13:30',
    placeId: 'node/1',
    hours: { status: 'open', label: 'Open until 6 PM' },
  };

  it('accepts a valid slot and requires end after start', () => {
    expect(SlotSchema.safeParse(slot).success).toBe(true);
    expect(SlotSchema.safeParse({ ...slot, end: '12:00' }).success).toBe(false);
  });

  it('requires a meal type on meal slots only', () => {
    expect(SlotSchema.safeParse({ ...slot, meal: undefined }).success).toBe(false);
    expect(SlotSchema.safeParse({ ...slot, kind: 'activity' }).success).toBe(false);
  });

  it('rejects place ids that are not OSM ids', () => {
    expect(SlotSchema.safeParse({ ...slot, placeId: 'Eiffel Tower' }).success).toBe(false);
  });

  it('finds places the LLM invented (not in the candidate list)', () => {
    const draft = ScheduleDraftSchema.parse({
      days: [
        {
          date: '2026-12-10',
          slots: [
            { kind: 'activity', start: '10:00', end: '12:00', placeId: 'node/1' },
            { kind: 'activity', start: '14:00', end: '16:00', placeId: 'way/999' },
          ],
        },
      ],
    });
    expect(findUnknownPlaceIds(draft, new Set(['node/1']))).toEqual(['way/999']);
  });
});
