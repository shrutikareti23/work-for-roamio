import { z } from 'zod';

export const PLACE_KINDS = ['attraction', 'restaurant', 'cafe', 'hotel'] as const;
export const PlaceKindSchema = z.enum(PLACE_KINDS);
export type PlaceKind = z.infer<typeof PlaceKindSchema>;

/**
 * A real place found in OpenStreetMap. `id` is the OSM id, e.g. "node/123456".
 * `tags` are the raw OSM tags (opening_hours, cuisine, diet:vegan, website, ...).
 * The LLM may only ever refer to places by these ids.
 */
export const PlaceCandidateSchema = z.object({
  id: z.string().regex(/^(node|way|relation)\/\d+$/),
  kind: PlaceKindSchema,
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tags: z.record(z.string(), z.string()),
});
export type PlaceCandidate = z.infer<typeof PlaceCandidateSchema>;
