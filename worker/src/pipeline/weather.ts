import { haversineKm, type DayWeather, type PlaceCandidate } from '@roamio/shared';

/**
 * Bad-weather handling. Only real forecasts trigger swaps: "typical weather"
 * (averages for trips > ~16 days away) is too vague to move plans around.
 */

export type WeatherAssessment = { bad: boolean; reasons: string[] };

// WMO weather codes used by Open-Meteo.
const THUNDER = new Set([95, 96, 99]);
const HEAVY_RAIN = new Set([65, 82]); // heavy rain, violent showers
const FREEZING_RAIN = new Set([66, 67]);
const HEAVY_SNOW = new Set([75, 86]);

export const BAD_WEATHER_LIMITS = {
  rainMm: 8, // daily total that ruins outdoor plans
  likelyRainMm: 3, // smaller totals count when rain is very likely
  likelyRainProbability: 70,
  heatC: 35,
  coldC: -5, // daytime high
  windKmh: 50,
};

export function assessDay(w: DayWeather): WeatherAssessment {
  if (w.source !== 'forecast') return { bad: false, reasons: [] };
  const L = BAD_WEATHER_LIMITS;
  const reasons: string[] = [];
  const code = w.weatherCode ?? -1;
  if (THUNDER.has(code)) reasons.push('Thunderstorms forecast');
  if (FREEZING_RAIN.has(code)) reasons.push('Freezing rain forecast');
  if (HEAVY_SNOW.has(code)) reasons.push('Heavy snow forecast');
  if (
    HEAVY_RAIN.has(code) ||
    w.precipitationMm >= L.rainMm ||
    (w.precipitationMm >= L.likelyRainMm &&
      (w.precipitationProbability ?? 0) >= L.likelyRainProbability)
  ) {
    reasons.push(`Heavy rain forecast (${w.precipitationMm} mm)`);
  }
  if (w.tempMaxC >= L.heatC) reasons.push(`Extreme heat (${Math.round(w.tempMaxC)}°C)`);
  if (w.tempMaxC <= L.coldC) reasons.push(`Extreme cold (${Math.round(w.tempMaxC)}°C)`);
  if (w.windMaxKmh >= L.windKmh) reasons.push(`Strong wind (${Math.round(w.windMaxKmh)} km/h)`);
  return { bad: reasons.length > 0, reasons };
}

export type Setting = 'indoor' | 'outdoor' | 'mixed' | 'unknown';

const INDOOR = {
  tourism: ['museum', 'gallery', 'aquarium'],
  amenity: [
    'theatre',
    'cinema',
    'arts_centre',
    'library',
    'planetarium',
    'place_of_worship',
    'casino',
    'concert_hall',
  ],
  leisure: [
    'sports_centre',
    'bowling_alley',
    'escape_game',
    'amusement_arcade',
    'sauna',
    'ice_rink',
  ],
};
const OUTDOOR = {
  tourism: ['viewpoint', 'zoo', 'theme_park', 'picnic_site', 'camp_site'],
  leisure: ['park', 'garden', 'nature_reserve', 'beach_resort', 'playground', 'marina'],
  historic: ['ruins', 'monument', 'memorial', 'archaeological_site', 'city_gate'],
  natural: ['beach', 'peak', 'waterfall', 'cliff', 'wood', 'cave_entrance', 'bay', 'spring'],
  boundary: ['national_park', 'protected_area'],
};
const MIXED = {
  historic: ['castle', 'fort', 'palace', 'manor', 'monastery'],
  amenity: ['marketplace'],
  tourism: ['attraction'],
};

function matches(tags: Record<string, string>, table: Record<string, string[]>): boolean {
  return Object.entries(table).some(([key, values]) => values.includes(tags[key] ?? ''));
}

/** Is this place indoors or outdoors, based on its OSM tags? */
export function classifySetting(place: Pick<PlaceCandidate, 'kind' | 'tags'>): Setting {
  const t = place.tags;
  if (t.indoor === 'yes' || t.building === 'yes') return 'indoor';
  if (t.indoor === 'no') return 'outdoor';
  if (place.kind !== 'attraction') return 'indoor'; // restaurants, cafés, hotels
  if (t.shop) return 'indoor';
  if (matches(t, INDOOR)) return 'indoor';
  if (matches(t, OUTDOOR) || t.natural) return 'outdoor';
  if (matches(t, MIXED)) return 'mixed';
  return 'unknown';
}

export type RemovedCandidate = { id: string; reason: string };

/**
 * Pipeline step 4d (before scheduling): on a bad-weather day, drop outdoor
 * attractions from that day's candidate list so the LLM can't schedule them.
 */
export function candidatesForDay(
  candidates: readonly PlaceCandidate[],
  weather: DayWeather | null,
): { allowed: PlaceCandidate[]; removed: RemovedCandidate[] } {
  const assessment = weather ? assessDay(weather) : { bad: false, reasons: [] };
  if (!assessment.bad) return { allowed: [...candidates], removed: [] };
  const reason = assessment.reasons.join('; ');
  const allowed: PlaceCandidate[] = [];
  const removed: RemovedCandidate[] = [];
  for (const c of candidates) {
    if (classifySetting(c) === 'outdoor') removed.push({ id: c.id, reason });
    else allowed.push(c);
  }
  return { allowed, removed };
}

export type SwappableSlot = {
  id: string;
  kind: 'activity' | 'meal';
  date: string;
  start: string;
  end: string;
  placeId: string;
};

export type Swap = { slotId: string; fromId: string; toId: string | null; reason: string };

/**
 * For an already-planned day (e.g. the forecast changed after planning), replace
 * outdoor activities with the nearest indoor attraction that is open then and not
 * already in the trip. If none fits, keep the original and report it.
 */
export function swapOutdoorSlots(
  slots: readonly SwappableSlot[],
  weather: DayWeather | null,
  pool: readonly PlaceCandidate[],
  options: {
    usedIds: ReadonlySet<string>;
    /** Should return false only when the place is known to be closed then. */
    isAvailable: (place: PlaceCandidate, slot: SwappableSlot) => boolean;
  },
): { slots: SwappableSlot[]; swaps: Swap[] } {
  const assessment = weather ? assessDay(weather) : { bad: false, reasons: [] };
  if (!assessment.bad) return { slots: [...slots], swaps: [] };
  const reason = assessment.reasons.join('; ');
  const byId = new Map(pool.map((p) => [p.id, p]));
  const used = new Set(options.usedIds);
  slots.forEach((s) => used.add(s.placeId));
  const swaps: Swap[] = [];

  const result = slots.map((slot) => {
    const current = byId.get(slot.placeId);
    if (slot.kind !== 'activity' || !current || classifySetting(current) !== 'outdoor') return slot;
    const replacement = pool
      .filter(
        (p) =>
          p.kind === 'attraction' &&
          !used.has(p.id) &&
          classifySetting(p) === 'indoor' &&
          options.isAvailable(p, slot),
      )
      .sort((a, b) => haversineKm(current, a) - haversineKm(current, b))[0];
    swaps.push({ slotId: slot.id, fromId: slot.placeId, toId: replacement?.id ?? null, reason });
    if (!replacement) return slot;
    used.add(replacement.id);
    return { ...slot, placeId: replacement.id };
  });
  return { slots: result, swaps };
}
