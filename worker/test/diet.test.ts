import { ALLERGEN_NOTICE, type Traveler } from '@roamio/shared';
import { describe, expect, it } from 'vitest';

import { combineNeeds, evaluateDiet, needStatus, verdictLabel } from '../src/pipeline/diet';

const traveler = (t: Partial<Traveler>): Traveler => ({
  name: 'T',
  interests: [],
  diet: [],
  allergies: [],
  isChild: false,
  ...t,
});

describe('combineNeeds (intersection of everyone’s restrictions)', () => {
  it('requires every traveler’s needs and merges allergies without duplicates', () => {
    const group = combineNeeds([
      traveler({ diet: ['vegan'], allergies: ['Peanuts'] }),
      traveler({ diet: ['gluten_free', 'vegan'], allergies: ['peanuts', 'Shellfish'] }),
      traveler({}),
    ]);
    expect(group.needs).toEqual(['vegan', 'gluten_free']);
    expect(group.allergies).toEqual(['Peanuts', 'Shellfish']);
  });
});

describe('needStatus', () => {
  it('reads yes / only / limited / no / missing', () => {
    expect(needStatus({ 'diet:halal': 'yes' }, 'halal')).toBe('yes');
    expect(needStatus({ 'diet:halal': 'only' }, 'halal')).toBe('yes');
    expect(needStatus({ 'diet:halal': 'limited' }, 'halal')).toBe('limited');
    expect(needStatus({ 'diet:halal': 'no' }, 'halal')).toBe('no');
    expect(needStatus({}, 'halal')).toBe('unknown');
  });

  it('infers safe implications: vegan menus are vegetarian and pescetarian-friendly', () => {
    const tags = { 'diet:vegan': 'only' };
    expect(needStatus(tags, 'vegetarian')).toBe('yes');
    expect(needStatus(tags, 'pescetarian')).toBe('yes');
    expect(needStatus({ cuisine: 'indian;vegetarian' }, 'vegetarian')).toBe('yes');
  });

  it('never infers in the unsafe direction', () => {
    expect(needStatus({ 'diet:vegetarian': 'yes' }, 'vegan')).toBe('unknown');
    expect(needStatus({ 'diet:vegan': 'yes' }, 'lactose_free')).toBe('unknown');
    expect(needStatus({ 'diet:vegan': 'yes' }, 'gluten_free')).toBe('unknown');
  });

  it('lets an explicit "no" win over any inference', () => {
    expect(needStatus({ 'diet:vegetarian': 'no', cuisine: 'vegetarian' }, 'vegetarian')).toBe('no');
  });
});

describe('evaluateDiet', () => {
  const group = { needs: ['vegan', 'gluten_free'] as const, allergies: [] as string[] };
  const g = { needs: [...group.needs], allergies: group.allergies };

  it('confirmed when every need is tagged yes', () => {
    const r = evaluateDiet({ 'diet:vegan': 'yes', 'diet:gluten_free': 'yes' }, g);
    expect(r.verdict).toBe('confirmed');
    expect(r.notice).toBe(ALLERGEN_NOTICE);
  });

  it('limited when some needs are only partly covered', () => {
    expect(evaluateDiet({ 'diet:vegan': 'yes', 'diet:gluten_free': 'limited' }, g).verdict).toBe(
      'limited',
    );
  });

  it('unconfirmed when any need has no data', () => {
    const r = evaluateDiet({ 'diet:vegan': 'yes' }, g);
    expect(r.verdict).toBe('unconfirmed');
    expect(verdictLabel(r.verdict)).toBe('Diet unconfirmed');
  });

  it('excluded when any traveler’s need is tagged "no"', () => {
    expect(evaluateDiet({ 'diet:vegan': 'no', 'diet:gluten_free': 'yes' }, g).verdict).toBe(
      'excluded',
    );
  });

  it('shows the allergen notice whenever allergies are listed, even with no diet needs', () => {
    const r = evaluateDiet({}, { needs: [], allergies: ['peanuts'] });
    expect(r.verdict).toBe('confirmed'); // nothing to check against tags...
    expect(r.allergies).toEqual(['peanuts']); // ...but allergies are always shown as unverified
    expect(r.notice).toBe(ALLERGEN_NOTICE);
  });

  it('shows no notice when nobody has diet needs or allergies', () => {
    expect(evaluateDiet({}, { needs: [], allergies: [] }).notice).toBeNull();
  });
});
