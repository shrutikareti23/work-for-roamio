export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_KM = 6371;

/** Straight-line ("as the crow flies") distance in km between two points. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Streets aren't straight lines: real walking routes are ~30% longer. */
export const DETOUR_FACTOR = 1.3;
const WALK_KMH = 4.8;

/** Rough walking minutes between two points (rounded up). */
export function walkingMinutes(a: LatLon, b: LatLon): number {
  return Math.ceil(((haversineKm(a, b) * DETOUR_FACTOR) / WALK_KMH) * 60);
}
