/**
 * Every outbound link the app opens: flights, stays, directions, reviews, phone, website.
 * We never call these sites' APIs or scrape them — we only build a prefilled search URL
 * and let the user's browser open it. If the input is incomplete or invalid we fall
 * back to the site's plain search page, so a button never leads to a broken page.
 *
 * Note: these URL formats are public but undocumented by Google Flights, Skyscanner,
 * Booking.com and Airbnb, and can change. Tests pin the format; if a site changes,
 * update it here only.
 */

export type DeepLink = {
  url: string;
  /** true when we couldn't prefill and are sending the user to the plain search page. */
  isFallback: boolean;
};

export const FALLBACK_URLS = {
  googleFlights: 'https://www.google.com/travel/flights',
  skyscanner: 'https://www.skyscanner.net/',
  booking: 'https://www.booking.com/',
  airbnb: 'https://www.airbnb.com/',
} as const;

export const MAX_ADULTS = 9;
export const MAX_CHILDREN = 8;

export type Party = {
  adults: number;
  /** Ages of children (0–17). Sites need ages; if unknown, leave empty and the site asks. */
  childAges?: number[];
};

export type FlightSearch = {
  /** IATA codes, e.g. "ORD", "LIS". */
  origin: string;
  destination: string;
  departDate: string;
  /** Omit for one-way. */
  returnDate?: string;
  party: Party;
  /** "YYYY-MM-DD" today, to reject past dates. Optional so tests can omit it. */
  today?: string;
};

export type StaySearch = {
  /** Place to search, e.g. "Lisbon, Portugal" or "Hotel Avenida Palace, Lisbon". */
  destination: string;
  checkIn: string;
  checkOut: string;
  party: Party;
  rooms?: number;
  today?: string;
};

// ---------- validation helpers ----------

const IATA = /^[A-Z]{3}$/;

export function isValidDate(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d;
}

function validParty(p: Party): boolean {
  const kids = p.childAges ?? [];
  return (
    Number.isInteger(p.adults) &&
    p.adults >= 1 &&
    p.adults <= MAX_ADULTS &&
    kids.length <= MAX_CHILDREN &&
    kids.every((a) => Number.isInteger(a) && a >= 0 && a <= 17)
  );
}

function validTrip(start: string, end: string | undefined, today?: string): boolean {
  if (!isValidDate(start)) return false;
  if (today && start < today) return false;
  if (end === undefined) return true;
  return isValidDate(end) && end >= start;
}

/** "2026-12-10" -> "261210" (Skyscanner's date format). */
const yymmdd = (d: string) => d.slice(2).replace(/-/g, '');

// ---------- flights ----------

export function googleFlightsUrl(s: FlightSearch): DeepLink {
  const origin = s.origin.toUpperCase();
  const dest = s.destination.toUpperCase();
  if (
    !IATA.test(origin) ||
    !IATA.test(dest) ||
    origin === dest ||
    !validParty(s.party) ||
    !validTrip(s.departDate, s.returnDate, s.today)
  ) {
    return { url: FALLBACK_URLS.googleFlights, isFallback: true };
  }
  // Google Flights accepts a plain-language query in `q`.
  const kids = s.party.childAges?.length ?? 0;
  let q = `Flights to ${dest} from ${origin} on ${s.departDate}`;
  q += s.returnDate ? ` through ${s.returnDate}` : ' one way';
  q += ` for ${s.party.adults} adult${s.party.adults === 1 ? '' : 's'}`;
  if (kids) q += ` and ${kids} child${kids === 1 ? '' : 'ren'}`;
  return {
    url: `${FALLBACK_URLS.googleFlights}?q=${encodeURIComponent(q)}`,
    isFallback: false,
  };
}

export function skyscannerUrl(s: FlightSearch): DeepLink {
  const origin = s.origin.toUpperCase();
  const dest = s.destination.toUpperCase();
  if (
    !IATA.test(origin) ||
    !IATA.test(dest) ||
    origin === dest ||
    !validParty(s.party) ||
    !validTrip(s.departDate, s.returnDate, s.today)
  ) {
    return { url: FALLBACK_URLS.skyscanner, isFallback: true };
  }
  const path = [origin.toLowerCase(), dest.toLowerCase(), yymmdd(s.departDate)];
  if (s.returnDate) path.push(yymmdd(s.returnDate));
  const params = new URLSearchParams({
    adultsv2: String(s.party.adults),
    cabinclass: 'economy',
    rtn: s.returnDate ? '1' : '0',
  });
  if (s.party.childAges?.length) params.set('childrenv2', s.party.childAges.join('|'));
  return {
    url: `https://www.skyscanner.net/transport/flights/${path.join('/')}/?${params.toString()}`,
    isFallback: false,
  };
}

// ---------- stays ----------

function validStay(s: StaySearch): boolean {
  const rooms = s.rooms ?? 1;
  return (
    s.destination.trim().length > 0 &&
    validParty(s.party) &&
    Number.isInteger(rooms) &&
    rooms >= 1 &&
    rooms <= s.party.adults &&
    validTrip(s.checkIn, s.checkOut, s.today) &&
    s.checkOut > s.checkIn
  );
}

export function bookingUrl(s: StaySearch): DeepLink {
  if (!validStay(s)) return { url: FALLBACK_URLS.booking, isFallback: true };
  const params = new URLSearchParams({
    ss: s.destination.trim(),
    checkin: s.checkIn,
    checkout: s.checkOut,
    group_adults: String(s.party.adults),
    group_children: String(s.party.childAges?.length ?? 0),
    no_rooms: String(s.rooms ?? 1),
  });
  for (const age of s.party.childAges ?? []) params.append('age', String(age));
  return {
    url: `https://www.booking.com/searchresults.html?${params.toString()}`,
    isFallback: false,
  };
}

export function airbnbUrl(s: StaySearch): DeepLink {
  if (!validStay(s)) return { url: FALLBACK_URLS.airbnb, isFallback: true };
  const ages = s.party.childAges ?? [];
  const params = new URLSearchParams({
    checkin: s.checkIn,
    checkout: s.checkOut,
    adults: String(s.party.adults),
    children: String(ages.filter((a) => a >= 2).length),
    infants: String(ages.filter((a) => a < 2).length),
  });
  // Airbnb's path style: "Lisbon, Portugal" -> "Lisbon--Portugal"
  const slug = s.destination
    .trim()
    .replace(/\s*,\s*/g, '--')
    .replace(/\s+/g, '-');
  return {
    url: `https://www.airbnb.com/s/${encodeURIComponent(slug)}/homes?${params.toString()}`,
    isFallback: false,
  };
}

// ---------- places ----------

export type PlaceRef = { name: string; lat: number; lon: number; city?: string };

function validCoords(p: PlaceRef): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
  );
}

/** Directions: Apple Maps on iPhone, Google Maps elsewhere (both official URL formats). */
export function directionsUrl(p: PlaceRef, platform: 'ios' | 'android' | 'web'): DeepLink {
  if (!validCoords(p)) {
    const q = encodeURIComponent([p.name, p.city].filter(Boolean).join(', '));
    return platform === 'ios'
      ? { url: `https://maps.apple.com/?q=${q}`, isFallback: true }
      : { url: `https://www.google.com/maps/search/?api=1&query=${q}`, isFallback: true };
  }
  const ll = `${p.lat},${p.lon}`;
  if (platform === 'ios') {
    const params = new URLSearchParams({ daddr: ll, q: p.name });
    return { url: `https://maps.apple.com/?${params.toString()}`, isFallback: false };
  }
  return {
    url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ll)}`,
    isFallback: false,
  };
}

/** "See reviews": a search for the place on Google Maps and Yelp (links only, no scraping). */
export function reviewUrls(p: PlaceRef): { googleMaps: DeepLink; yelp: DeepLink } {
  const query = [p.name, p.city].filter(Boolean).join(', ');
  const yelp = new URLSearchParams({ find_desc: p.name });
  if (p.city) yelp.set('find_loc', p.city);
  else if (validCoords(p)) yelp.set('find_loc', `${p.lat},${p.lon}`);
  return {
    googleMaps: {
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      isFallback: false,
    },
    yelp: { url: `https://www.yelp.com/search?${yelp.toString()}`, isFallback: false },
  };
}

/**
 * OSM `phone` tag -> "tel:" link. Tags can hold several numbers separated by ";",
 * we use the first. Returns null if it doesn't look like a phone number.
 */
export function phoneUrl(tag: string | undefined): string | null {
  const first = tag?.split(';')[0]?.trim();
  if (!first) return null;
  const cleaned = first.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15 || cleaned.lastIndexOf('+') > 0) return null;
  return `tel:${cleaned}`;
}

/** OSM `website` / `contact:website` tag -> safe http(s) URL, or null. */
export function websiteUrl(tag: string | undefined): string | null {
  const raw = tag?.split(';')[0]?.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}
