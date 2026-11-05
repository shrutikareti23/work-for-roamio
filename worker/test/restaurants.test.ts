import { describe, expect, it } from 'vitest';

import { pickRestaurants, type MealRequest } from '../src/pipeline/restaurants';
import { CENTER, place } from './fixtures';

const OPEN = { opening_hours: 'Mo-Su 12:00-23:00' };

const baseRequest: MealRequest = {
  meal: 'lunch',
  date: '2026-12-10',
  start: '13:00',
  end: '14:00',
  from: CENTER,
  transport: 'walk',
  group: { needs: [], allergies: [] },
  countryCode: 'PT',
};

describe('pickRestaurants', () => {
  it('returns 1 main pick and 2 backups, closest first when otherwise equal', () => {
    const a = place('restaurant', 'A', 100, OPEN);
    const b = place('restaurant', 'B', 300, OPEN);
    const c = place('restaurant', 'C', 500, OPEN);
    const d = place('restaurant', 'D', 700, OPEN);
    const r = pickRestaurants([d, c, b, a], baseRequest);
    expect(r.main?.place.name).toBe('A');
    expect(r.backups.map((x) => x.place.name)).toEqual(['B', 'C']);
    expect(r.message).toBeNull();
  });

  it('skips places closed during the meal', () => {
    const closed = place('restaurant', 'Dinner only', 50, { opening_hours: 'Mo-Su 19:00-23:00' });
    const open = place('restaurant', 'Open', 400, OPEN);
    expect(pickRestaurants([closed, open], baseRequest).main?.place.name).toBe('Open');
  });

  it('allows unknown hours but ranks verified hours higher', () => {
    const unknown = place('restaurant', 'Unknown hours', 50);
    const known = place('restaurant', 'Known hours', 300, OPEN);
    const r = pickRestaurants([unknown, known], baseRequest);
    expect(r.main?.place.name).toBe('Known hours');
    expect(r.backups[0]?.hours.label).toBe('Hours unverified');
  });

  it('must suit ALL travelers: drops places tagged "no" for anyone’s diet', () => {
    const group = { needs: ['vegan' as const, 'gluten_free' as const], allergies: [] };
    const noVegan = place('restaurant', 'Steakhouse', 50, { ...OPEN, 'diet:vegan': 'no' });
    const confirmed = place('restaurant', 'Both', 600, {
      ...OPEN,
      'diet:vegan': 'yes',
      'diet:gluten_free': 'yes',
    });
    const unconfirmed = place('restaurant', 'Maybe', 100, OPEN);
    const r = pickRestaurants([noVegan, confirmed, unconfirmed], { ...baseRequest, group });
    const names = [r.main, ...r.backups].map((x) => x?.place.name);
    expect(names).not.toContain('Steakhouse');
    expect(r.main?.place.name).toBe('Both'); // confirmed beats closer-but-unconfirmed
    expect(r.backups[0]?.diet.verdict).toBe('unconfirmed');
  });

  it('widens the search when fewer than 3 places are nearby', () => {
    const near = place('restaurant', 'Near', 200, OPEN);
    const far1 = place('restaurant', 'Far 1', 1800, OPEN);
    const far2 = place('restaurant', 'Far 2', 3500, OPEN);
    const tooFar = place('restaurant', 'Too far', 9000, OPEN);
    const r = pickRestaurants([near, far1, far2, tooFar], baseRequest);
    expect([r.main, ...r.backups].map((x) => x?.place.name)).toEqual(['Near', 'Far 1', 'Far 2']);
  });

  it('does not repeat places already used in the trip', () => {
    const used = place('restaurant', 'Yesterday', 50, OPEN);
    const other = place('restaurant', 'New', 400, OPEN);
    const r = pickRestaurants([used, other], { ...baseRequest, usedIds: new Set([used.id]) });
    expect(r.main?.place.name).toBe('New');
  });

  it('prefers cafés for breakfast and restaurants for dinner', () => {
    const cafe = place('cafe', 'Café', 300, { opening_hours: 'Mo-Su 07:00-23:00' });
    const resto = place('restaurant', 'Restaurant', 250, { opening_hours: 'Mo-Su 07:00-23:00' });
    const breakfast = { ...baseRequest, meal: 'breakfast' as const, start: '08:30', end: '09:15' };
    expect(pickRestaurants([cafe, resto], breakfast).main?.place.name).toBe('Café');
    const dinner = { ...baseRequest, meal: 'dinner' as const, start: '19:30', end: '21:00' };
    expect(pickRestaurants([cafe, resto], dinner).main?.place.name).toBe('Restaurant');
  });

  it('gives a friendly message when nothing fits', () => {
    const r = pickRestaurants([], baseRequest);
    expect(r).toEqual({
      main: null,
      backups: [],
      message: "We couldn't find an open lunch spot nearby that fits everyone's diet.",
    });
  });

  it('lists only real facts for the "why we picked it" line', () => {
    const p = place('restaurant', 'Tasca', 400, {
      ...OPEN,
      cuisine: 'portuguese;seafood',
      'diet:vegetarian': 'limited',
    });
    const group = { needs: ['vegetarian' as const], allergies: [] };
    const r = pickRestaurants([p], { ...baseRequest, group });
    expect(r.main?.facts).toEqual([
      '7 min walk from your previous stop',
      'Open until 11 PM on this day',
      'Cuisine: portuguese, seafood',
      'Some vegetarian options listed on OpenStreetMap',
    ]);
  });
});
