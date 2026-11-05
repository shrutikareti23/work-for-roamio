import { haversineKm, type LatLon } from '@roamio/shared';

import data from '../data/airports.json';

/**
 * City name -> airport code, using the bundled OurAirports data (public domain;
 * rebuilt with scripts/build-airports.mjs). Only airports with scheduled flights.
 */

export type Airport = {
  iata: string;
  name: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  large: boolean;
};

type Row = [string, string, string, string, number, number, number];

const AIRPORTS: Airport[] = (data.airports as Row[]).map(
  ([iata, name, city, cc, lat, lon, large]) => ({
    iata,
    name,
    city,
    countryCode: cc,
    lat,
    lon,
    large: large === 1,
  }),
);
const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

/** Lowercase, remove accents and punctuation: "São Paulo" -> "sao paulo". */
export function normalizeCity(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Paris (Roissy-en-France, Val-d'Oise)" -> "paris" */
function cityKey(municipality: string): string {
  return normalizeCity(municipality.split('(')[0] ?? '');
}

const BY_CITY = new Map<string, Airport[]>();
for (const a of AIRPORTS) {
  const key = cityKey(a.city);
  if (!key) continue;
  BY_CITY.set(key, [...(BY_CITY.get(key) ?? []), a]);
}

/** Other common names for cities. */
const ALIASES: Record<string, string> = {
  delhi: 'new delhi',
  bangalore: 'bengaluru',
  bombay: 'mumbai',
  madras: 'chennai',
  calcutta: 'kolkata',
  nyc: 'new york',
  'new york city': 'new york',
  'washington dc': 'washington',
  'washington d c': 'washington',
  saigon: 'ho chi minh city',
  peking: 'beijing',
  lisboa: 'lisbon',
  roma: 'rome',
  milano: 'milan',
  munchen: 'munich',
  koln: 'cologne',
  wien: 'vienna',
  praha: 'prague',
  firenze: 'florence',
  venezia: 'venice',
  napoli: 'naples',
  sevilla: 'seville',
  bruxelles: 'brussels',
  kyiv: 'kiev',
  'sao paulo': 'sao paulo',
  la: 'los angeles',
  sf: 'san francisco',
};

/**
 * Main international airport for cities with several, so "Chicago" gives ORD
 * rather than MDW. Also covers cities whose airport is listed under a suburb.
 */
const PRIMARY: Record<string, string> = {
  chicago: 'ORD',
  'new york': 'JFK',
  london: 'LHR',
  paris: 'CDG',
  tokyo: 'HND',
  washington: 'IAD',
  houston: 'IAH',
  milan: 'MXP',
  rome: 'FCO',
  moscow: 'SVO',
  'sao paulo': 'GRU',
  osaka: 'KIX',
  seoul: 'ICN',
  shanghai: 'PVG',
  beijing: 'PEK',
  istanbul: 'IST',
  stockholm: 'ARN',
  'buenos aires': 'EZE',
  toronto: 'YYZ',
  montreal: 'YUL',
  bangkok: 'BKK',
  jakarta: 'CGK',
  dallas: 'DFW',
  'rio de janeiro': 'GIG',
  dubai: 'DXB',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  sydney: 'SYD',
  'mexico city': 'MEX',
  'tel aviv': 'TLV',
  oslo: 'OSL',
  copenhagen: 'CPH',
  amsterdam: 'AMS',
  frankfurt: 'FRA',
  munich: 'MUC',
  zurich: 'ZRH',
  vienna: 'VIE',
  brussels: 'BRU',
  barcelona: 'BCN',
  madrid: 'MAD',
  venice: 'VCE',
  athens: 'ATH',
  dublin: 'DUB',
  singapore: 'SIN',
  'hong kong': 'HKG',
  'kuala lumpur': 'KUL',
  manila: 'MNL',
  taipei: 'TPE',
  melbourne: 'MEL',
  vancouver: 'YVR',
  miami: 'MIA',
  orlando: 'MCO',
  boston: 'BOS',
  seattle: 'SEA',
  atlanta: 'ATL',
  denver: 'DEN',
  'las vegas': 'LAS',
  honolulu: 'HNL',
  cairo: 'CAI',
  johannesburg: 'JNB',
  'cape town': 'CPT',
  nairobi: 'NBO',
  doha: 'DOH',
  'abu dhabi': 'AUH',
};

export type AirportLookup = {
  /** "Chicago" or "Chicago, US" or an airport code like "ORD". */
  query: string;
  /** Restrict to a country (ISO code), when known. */
  countryCode?: string;
  /** Coordinates of the place (from geocoding) for the nearest-airport fallback. */
  near?: LatLon;
};

export type AirportMatch = { airport: Airport; match: 'code' | 'city' | 'nearest' };

/** Best airport for a city, or null if we can't tell. Never guesses wildly. */
export function findAirport(input: AirportLookup): AirportMatch | null {
  const raw = input.query.trim();
  const cc = input.countryCode?.toUpperCase();

  if (/^[A-Za-z]{3}$/.test(raw)) {
    const byCode = BY_IATA.get(raw.toUpperCase());
    if (byCode && (!cc || byCode.countryCode === cc)) return { airport: byCode, match: 'code' };
  }

  // "Lisbon, Portugal" -> "lisbon"
  let city = normalizeCity(raw.split(',')[0] ?? '');
  city = ALIASES[city] ?? city;

  const primaryCode = PRIMARY[city];
  const primary = primaryCode ? BY_IATA.get(primaryCode) : undefined;
  if (primary && (!cc || primary.countryCode === cc)) return { airport: primary, match: 'city' };

  const options = (BY_CITY.get(city) ?? []).filter((a) => !cc || a.countryCode === cc);
  if (options.length) {
    const sorted = [...options].sort(
      (a, b) =>
        Number(b.large) - Number(a.large) ||
        (input.near ? haversineKm(input.near, a) - haversineKm(input.near, b) : 0),
    );
    const best = sorted[0];
    if (best) return { airport: best, match: 'city' };
  }

  if (input.near) {
    const nearest = nearestAirports(input.near, 150)[0];
    if (nearest) return { airport: nearest, match: 'nearest' };
  }
  return null;
}

/**
 * Airports within `maxKm`, large ones first, then by distance. Used for small towns
 * (e.g. Sintra -> LIS) once we have coordinates from geocoding.
 */
export function nearestAirports(point: LatLon, maxKm: number): Airport[] {
  return AIRPORTS.map((a) => ({ a, d: haversineKm(point, a) }))
    .filter(({ d }) => d <= maxKm)
    .sort((x, y) => Number(y.a.large) - Number(x.a.large) || x.d - y.d)
    .map(({ a }) => a);
}

/** "Chicago (ORD)" — uses the traveler's own city name when given. */
export function airportLabel(cityName: string, airport: Airport): string {
  return `${cityName.split(',')[0]?.trim() || airport.city} (${airport.iata})`;
}
