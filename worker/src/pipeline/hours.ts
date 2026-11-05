import OpeningHours from 'opening_hours';
import { toMinutes, type HoursStatus } from '@roamio/shared';

/**
 * Opening-hours checks using the `opening_hours` library (LGPL-3.0).
 * It runs only here on the server, never inside the app.
 *
 * Times are "wall-clock" times at the destination. We build JS Dates with the
 * local-time constructor and the library reads them back with local getters,
 * so results don't depend on the server's own time zone.
 */

export type PlaceContext = {
  lat: number;
  lon: number;
  /** ISO 3166 two-letter code, e.g. "pt". Needed for public holidays ("PH off"). */
  countryCode: string;
};

export type HoursCheck = {
  status: HoursStatus;
  /** Plain-language label for cards, e.g. "Open until 6 PM", "Hours unverified". */
  label: string;
};

const UNVERIFIED: HoursCheck = { status: 'unverified', label: 'Hours unverified' };
const OPEN_24H: HoursCheck = { status: 'open', label: 'Open 24 hours' };

function localDate(date: string, time: string): Date {
  const [y = 0, mo = 1, d = 1] = date.split('-').map(Number);
  const mins = toMinutes(time);
  return new Date(y, mo - 1, d, Math.floor(mins / 60), mins % 60);
}

/** "18:00" -> "6 PM", "09:30" -> "9:30 AM", "00:00" -> "midnight". */
export function formatTime12h(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return 'midnight';
  if (h === 12 && m === 0) return 'noon';
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Parse an OSM opening_hours tag. Returns null when missing or invalid. */
function parse(tag: string | undefined, ctx: PlaceContext): OpeningHours | null {
  if (!tag || !tag.trim()) return null;
  try {
    return new OpeningHours(tag, {
      lat: ctx.lat,
      lon: ctx.lon,
      address: { country_code: ctx.countryCode.toLowerCase(), state: '' },
    });
  } catch {
    return null;
  }
}

/**
 * Is the place open for the WHOLE visit on `date` from `start` to `end`?
 * - "open": open the entire time
 * - "closed": closed at some point during the visit
 * - "unverified": no hours, unparsable hours, or the tag itself says "unknown"
 */
export function checkVisit(
  tag: string | undefined,
  date: string,
  start: string,
  end: string,
  ctx: PlaceContext,
): HoursCheck {
  if (tag?.trim() === '24/7') return OPEN_24H;
  const oh = parse(tag, ctx);
  if (!oh) return UNVERIFIED;

  const from = localDate(date, start);
  const to = localDate(date, end);
  // getOpenIntervals lists each open stretch overlapping [from, to]; the visit fits only
  // if one interval covers it entirely. Index 2 is the "unknown" flag.
  const intervals = oh.getOpenIntervals(from, to);
  if (intervals.some(([, , unknown]) => unknown)) return UNVERIFIED;
  const covering = intervals.find(([s, e]) => s <= from && e >= to);
  if (covering) {
    const closesAt = oh.getNextChange(from);
    return {
      status: 'open',
      label: closesAt ? `Open until ${formatTime12h(closesAt)}` : 'Open',
    };
  }
  if (oh.getStateString(from, true) === 'unknown') return UNVERIFIED;
  return { status: 'closed', label: closedLabel(oh, from) };
}

function closedLabel(oh: OpeningHours, at: Date): string {
  if (oh.getState(at)) {
    // Open at the start but closes before the visit ends.
    const closes = oh.getNextChange(at);
    return closes ? `Closes at ${formatTime12h(closes)}` : 'Closed';
  }
  const endOfDay = new Date(at.getFullYear(), at.getMonth(), at.getDate(), 23, 59);
  const opens = oh.getNextChange(at, endOfDay);
  return opens ? `Closed · opens ${formatTime12h(opens)}` : 'Closed today';
}

/** Card label for a moment in time, e.g. "Open until 6 PM" or "Closed · opens 9 AM". */
export function hoursLabelAt(
  tag: string | undefined,
  date: string,
  time: string,
  ctx: PlaceContext,
): HoursCheck {
  if (tag?.trim() === '24/7') return OPEN_24H;
  const oh = parse(tag, ctx);
  if (!oh) return UNVERIFIED;
  const at = localDate(date, time);
  const state = oh.getStateString(at, true);
  if (state === 'unknown') return UNVERIFIED;
  if (state === 'closed') return { status: 'closed', label: closedLabel(oh, at) };
  const closes = oh.getNextChange(at);
  return { status: 'open', label: closes ? `Open until ${formatTime12h(closes)}` : 'Open' };
}
