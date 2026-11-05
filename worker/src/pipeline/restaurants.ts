import { haversineKm, walkingMinutes, type LatLon, type PlaceCandidate } from '@roamio/shared';

import { evaluateDiet, type DietResult, type GroupNeeds } from './diet';
import { checkVisit, type HoursCheck, type PlaceContext } from './hours';

export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type Transport = 'walk' | 'transit' | 'car';

/** How far (straight line) we look first, by how the group gets around. */
export const SEARCH_RADIUS_KM: Record<Transport, number> = { walk: 1, transit: 3, car: 8 };
/** If too few options nearby, widen the search by these multipliers. */
const WIDEN_STEPS = [1, 2, 4];

export type MealRequest = {
  meal: MealType;
  date: string;
  start: string;
  end: string;
  /** Where the group is coming from (the previous activity). */
  from: LatLon;
  transport: Transport;
  group: GroupNeeds;
  countryCode: string;
  /** Places already used in the trip, so we don't repeat them. */
  usedIds?: ReadonlySet<string>;
  /** Cuisines the group said they like, e.g. ["portuguese", "seafood"]. */
  likedCuisines?: string[];
};

export type ScoredRestaurant = {
  place: PlaceCandidate;
  score: number;
  distanceKm: number;
  walkMinutes: number;
  hours: HoursCheck;
  diet: DietResult;
  /** Plain facts for the "why we picked it" line. Only things we actually know. */
  facts: string[];
};

export type MealPick = {
  main: ScoredRestaurant | null;
  backups: ScoredRestaurant[];
  /** Set when nothing suitable was found, for a friendly message. */
  message: string | null;
};

function cuisines(tags: Record<string, string>): string[] {
  return (tags.cuisine ?? '')
    .split(';')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

function score(r: Omit<ScoredRestaurant, 'score' | 'facts'>, req: MealRequest): number {
  let s = 0;
  if (req.group.needs.length > 0) {
    s += { confirmed: 30, limited: 18, unconfirmed: 8, excluded: -1000 }[r.diet.verdict];
  }
  s += r.hours.status === 'open' ? 20 : 0; // verified hours beat unverified
  const amenity = r.place.tags.amenity;
  const isCafe = r.place.kind === 'cafe' || amenity === 'cafe';
  if (req.meal === 'breakfast') s += isCafe ? 10 : 0;
  if (req.meal === 'dinner' && isCafe) s -= 10;
  if (amenity === 'fast_food') s -= 5;
  const liked = (req.likedCuisines ?? []).map((c) => c.toLowerCase());
  if (cuisines(r.place.tags).some((c) => liked.includes(c))) s += 8;
  if (r.place.tags.website || r.place.tags['contact:website']) s += 2;
  s -= r.walkMinutes * 0.5; // closer is better
  return s;
}

function facts(r: Omit<ScoredRestaurant, 'score' | 'facts'>, req: MealRequest): string[] {
  const out: string[] = [];
  out.push(
    req.transport === 'walk' || r.walkMinutes <= 20
      ? `${r.walkMinutes} min walk from your previous stop`
      : `${r.distanceKm.toFixed(1)} km from your previous stop`,
  );
  if (r.hours.status === 'open') out.push(`${r.hours.label} on this day`);
  const c = cuisines(r.place.tags);
  if (c.length) out.push(`Cuisine: ${c.map((x) => x.replace(/_/g, ' ')).join(', ')}`);
  for (const b of r.diet.badges) {
    if (b.status === 'yes') out.push(`${b.label} options listed on OpenStreetMap`);
    if (b.status === 'limited')
      out.push(`Some ${b.label.toLowerCase()} options listed on OpenStreetMap`);
  }
  if (r.place.tags.outdoor_seating === 'yes') out.push('Has outdoor seating');
  if (r.place.tags.wheelchair === 'yes') out.push('Wheelchair accessible (per OpenStreetMap)');
  return out;
}

/**
 * Pick 1 main restaurant + 2 backups for a meal slot. Rules:
 * - never closed during the meal (unknown hours allowed, but ranked lower)
 * - never tagged "no" for anyone's diet (unknown allowed, labelled "Diet unconfirmed")
 * - not already used in the trip
 * - nearby; the search widens step by step if fewer than 3 options are found
 */
export function pickRestaurants(candidates: readonly PlaceCandidate[], req: MealRequest): MealPick {
  const used = req.usedIds ?? new Set<string>();
  const ctxBase = { countryCode: req.countryCode };

  const eligible: Omit<ScoredRestaurant, 'score' | 'facts'>[] = [];
  for (const place of candidates) {
    if ((place.kind !== 'restaurant' && place.kind !== 'cafe') || used.has(place.id)) continue;
    const diet = evaluateDiet(place.tags, req.group);
    if (diet.verdict === 'excluded') continue;
    const ctx: PlaceContext = { ...ctxBase, lat: place.lat, lon: place.lon };
    const hours = checkVisit(place.tags.opening_hours, req.date, req.start, req.end, ctx);
    if (hours.status === 'closed') continue;
    eligible.push({
      place,
      diet,
      hours,
      distanceKm: haversineKm(req.from, place),
      walkMinutes: walkingMinutes(req.from, place),
    });
  }

  const base = SEARCH_RADIUS_KM[req.transport];
  let nearby = eligible;
  for (const step of WIDEN_STEPS) {
    nearby = eligible.filter((r) => r.distanceKm <= base * step);
    if (nearby.length >= 3) break;
  }

  const ranked = nearby
    .map((r) => ({ ...r, score: score(r, req), facts: facts(r, req) }))
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

  const [main = null, ...rest] = ranked;
  return {
    main,
    backups: rest.slice(0, 2),
    message: main
      ? null
      : `We couldn't find an open ${req.meal} spot nearby that fits everyone's diet.`,
  };
}
