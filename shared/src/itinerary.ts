import { z } from 'zod';

import { IsoDateSchema, TimeSchema, toMinutes } from './dates';
import { DayWeatherSchema } from './weather';

const PlaceIdSchema = z.string().regex(/^(node|way|relation)\/\d+$/);

export const HoursStatusSchema = z.enum(['open', 'closed', 'unverified']);
export type HoursStatus = z.infer<typeof HoursStatusSchema>;

export const SlotSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['activity', 'meal']),
    meal: z.enum(['breakfast', 'lunch', 'dinner']).optional(),
    start: TimeSchema,
    end: TimeSchema,
    placeId: PlaceIdSchema,
    /** Restaurants: 2 backups. Activities: optional alternatives. */
    backupPlaceIds: z.array(PlaceIdSchema).max(5).default([]),
    hours: z.object({ status: HoursStatusSchema, label: z.string() }),
    note: z.string().max(300).optional(),
  })
  .refine((s) => toMinutes(s.end) > toMinutes(s.start), {
    message: 'Slot must end after it starts',
    path: ['end'],
  })
  .refine((s) => (s.kind === 'meal') === (s.meal !== undefined), {
    message: 'Meal slots need a meal type; activity slots must not have one',
    path: ['meal'],
  });
export type Slot = z.infer<typeof SlotSchema>;

export const ItineraryDaySchema = z.object({
  date: IsoDateSchema,
  weather: DayWeatherSchema.nullable(),
  slots: z.array(SlotSchema),
});
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;

export const ItinerarySchema = z.object({
  days: z.array(ItineraryDaySchema).min(1),
  hotelIds: z.array(PlaceIdSchema).default([]),
});
export type Itinerary = z.infer<typeof ItinerarySchema>;

/**
 * What we ask Gemini to return: the bare schedule (ids + times only).
 * We then check every placeId against the candidate list and fill in hours,
 * backups and weather ourselves, so the LLM can't invent facts.
 */
export const ScheduleDraftSchema = z.object({
  days: z
    .array(
      z.object({
        date: IsoDateSchema,
        slots: z
          .array(
            z.object({
              kind: z.enum(['activity', 'meal']),
              meal: z.enum(['breakfast', 'lunch', 'dinner']).optional(),
              start: TimeSchema,
              end: TimeSchema,
              placeId: PlaceIdSchema,
            }),
          )
          .max(12),
      }),
    )
    .min(1),
});
export type ScheduleDraft = z.infer<typeof ScheduleDraftSchema>;

/** Returns the placeIds in a draft that are NOT in the allowed set (i.e. invented). */
export function findUnknownPlaceIds(draft: ScheduleDraft, allowed: ReadonlySet<string>): string[] {
  const unknown = new Set<string>();
  for (const day of draft.days) {
    for (const slot of day.slots) {
      if (!allowed.has(slot.placeId)) unknown.add(slot.placeId);
    }
  }
  return [...unknown];
}
