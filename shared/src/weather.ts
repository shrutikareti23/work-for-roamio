import { z } from 'zod';

import { IsoDateSchema } from './dates';

/**
 * One day's weather. `source` says where it came from:
 * - "forecast": Open-Meteo forecast (only ~16 days ahead)
 * - "typical": averages of past years for that date — must be labelled "Typical weather"
 */
export const DayWeatherSchema = z.object({
  date: IsoDateSchema,
  source: z.enum(['forecast', 'typical']),
  /** WMO weather code (Open-Meteo `weather_code`). */
  weatherCode: z.number().int().nullable(),
  tempMaxC: z.number(),
  tempMinC: z.number(),
  precipitationMm: z.number().min(0),
  /** 0–100, forecast only. */
  precipitationProbability: z.number().min(0).max(100).nullable(),
  windMaxKmh: z.number().min(0),
});
export type DayWeather = z.infer<typeof DayWeatherSchema>;
