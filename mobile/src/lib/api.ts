import { HealthResponseSchema, type HealthResponse } from '@roamio/shared';

import { config } from './config';

/**
 * Result type: either success with data, or a failure with a message that is safe to
 * show the user. Similar to returning (ok, value) in Python instead of raising.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

type FetchFn = typeof fetch;

/** Ask the Worker if it is up. `fetchFn` can be swapped in tests. */
export async function checkHealth(
  baseUrl: string = config.apiUrl,
  fetchFn: FetchFn = fetch,
): Promise<ApiResult<HealthResponse>> {
  if (!baseUrl) {
    return { ok: false, message: 'Server not configured yet.' };
  }
  try {
    const res = await fetchFn(`${baseUrl}/health`);
    if (!res.ok) {
      return { ok: false, message: `Server responded with an error (${res.status}).` };
    }
    const parsed = HealthResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      return { ok: false, message: 'Server sent an unexpected response.' };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, message: "Can't reach the server. Check your connection." };
  }
}
