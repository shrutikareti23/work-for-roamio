import { z } from 'zod';

/**
 * Shape of the Worker's GET /health response.
 * zod is like pydantic: the schema describes the data and `parse` checks it at runtime.
 */
export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal('roamio-worker'),
  version: z.string(),
  time: z.string(),
});

/** The TypeScript type, derived from the schema (like a pydantic model class). */
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
