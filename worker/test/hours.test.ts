import { describe, expect, it } from 'vitest';

import { checkVisit, formatTime12h, hoursLabelAt } from '../src/pipeline/hours';

const lisbon = { lat: 38.7223, lon: -9.1393, countryCode: 'PT' };
// 2026-12-10 is a Thursday, 2026-12-12 a Saturday, 2026-12-08 a Portuguese public holiday.
const THU = '2026-12-10';
const SAT = '2026-12-12';
const HOLIDAY = '2026-12-08';
const weekday = 'Mo-Fr 09:00-18:00';

describe('checkVisit', () => {
  it('is open when the whole visit fits inside opening hours', () => {
    expect(checkVisit(weekday, THU, '10:00', '12:00', lisbon)).toEqual({
      status: 'open',
      label: 'Open until 6 PM',
    });
  });

  it('is closed when the place closes during the visit', () => {
    expect(checkVisit(weekday, THU, '17:00', '19:00', lisbon)).toEqual({
      status: 'closed',
      label: 'Closes at 6 PM',
    });
  });

  it('is closed before opening time and says when it opens', () => {
    expect(checkVisit(weekday, THU, '07:00', '08:00', lisbon)).toEqual({
      status: 'closed',
      label: 'Closed · opens 9 AM',
    });
  });

  it('is closed on days it does not open', () => {
    expect(checkVisit(weekday, SAT, '10:00', '12:00', lisbon)).toEqual({
      status: 'closed',
      label: 'Closed today',
    });
  });

  it('respects public holidays ("PH off") for the destination country', () => {
    expect(checkVisit(`${weekday}; PH off`, HOLIDAY, '10:00', '12:00', lisbon).status).toBe(
      'closed',
    );
    expect(checkVisit(`${weekday}; PH off`, THU, '10:00', '12:00', lisbon).status).toBe('open');
  });

  it('handles split hours (lunch and dinner service)', () => {
    const tag = 'Mo-Su 12:00-15:00,19:00-23:00';
    expect(checkVisit(tag, THU, '14:00', '16:00', lisbon).status).toBe('closed');
    expect(checkVisit(tag, THU, '19:30', '21:00', lisbon)).toEqual({
      status: 'open',
      label: 'Open until 11 PM',
    });
  });

  it('handles hours that run past midnight', () => {
    expect(checkVisit('Mo-Su 18:00-02:00', THU, '22:00', '23:30', lisbon)).toEqual({
      status: 'open',
      label: 'Open until 2 AM',
    });
  });

  it('treats 24/7 as always open', () => {
    expect(checkVisit('24/7', SAT, '03:00', '04:00', lisbon)).toEqual({
      status: 'open',
      label: 'Open 24 hours',
    });
  });

  it.each([
    ['missing tag', undefined],
    ['empty tag', '  '],
    ['unparsable tag', 'ask the owner'],
    ['tag marked unknown', 'Mo-Fr 10:00-18:00 unknown'],
  ])('marks "Hours unverified" for a %s', (_name, tag) => {
    expect(checkVisit(tag, THU, '11:00', '12:00', lisbon)).toEqual({
      status: 'unverified',
      label: 'Hours unverified',
    });
  });
});

describe('hoursLabelAt', () => {
  it('gives card labels for open, closed and unknown', () => {
    expect(hoursLabelAt(weekday, THU, '12:00', lisbon).label).toBe('Open until 6 PM');
    expect(hoursLabelAt(weekday, THU, '20:00', lisbon).label).toBe('Closed today');
    expect(hoursLabelAt(weekday, THU, '08:00', lisbon).label).toBe('Closed · opens 9 AM');
    expect(hoursLabelAt(undefined, THU, '12:00', lisbon).label).toBe('Hours unverified');
  });
});

describe('formatTime12h', () => {
  it.each([
    [9, 30, '9:30 AM'],
    [12, 0, 'noon'],
    [0, 0, 'midnight'],
    [18, 0, '6 PM'],
    [0, 15, '12:15 AM'],
  ])('%i:%i -> %s', (h, m, expected) => {
    expect(formatTime12h(new Date(2026, 0, 1, h, m))).toBe(expected);
  });
});
