import { z } from 'zod';

import { IsoDateSchema } from './dates';
import { DietNeedSchema } from './diet';

export const TravelerSchema = z.object({
  name: z.string().min(1).max(60),
  /** e.g. "museums", "street food", "hiking" */
  interests: z.array(z.string().min(1).max(60)).max(20).default([]),
  diet: z.array(DietNeedSchema).default([]),
  /** Free text, e.g. "peanuts", "shellfish". Never treated as verified. */
  allergies: z.array(z.string().min(1).max(60)).max(20).default([]),
  isChild: z.boolean().default(false),
});
export type Traveler = z.infer<typeof TravelerSchema>;

export const TripProfileSchema = z
  .object({
    destinations: z.array(z.string().min(1).max(120)).min(1).max(5),
    origin: z.string().min(1).max(120),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    travelers: z.array(TravelerSchema).min(1).max(12),
    restrictions: z
      .object({
        mobility: z.enum(['none', 'limited', 'wheelchair']).default('none'),
        budget: z.enum(['low', 'medium', 'high']).default('medium'),
        pace: z.enum(['relaxed', 'balanced', 'packed']).default('balanced'),
        transport: z.enum(['walk', 'transit', 'car']).default('walk'),
        notes: z.string().max(500).default(''),
      })
      .prefault({}),
  })
  .refine((t) => t.endDate >= t.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
export type TripProfile = z.infer<typeof TripProfileSchema>;
