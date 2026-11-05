import { HealthResponseSchema } from '@roamio/shared';
import { describe, expect, it } from 'vitest';

import worker from '../src/index';
import type { Env } from '../src/env';

const env: Env = { APP_VERSION: '9.9.9-test' };

function call(path: string, method = 'GET') {
  return worker.fetch(new Request(`https://worker.test${path}`, { method }), env);
}

describe('GET /health', () => {
  it('returns ok with the configured version', async () => {
    const res = await call('/health');
    expect(res.status).toBe(200);
    const body = HealthResponseSchema.parse(await res.json());
    expect(body.version).toBe('9.9.9-test');
  });
});

describe('unknown routes', () => {
  it('returns a 404 JSON error', async () => {
    const res = await call('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: 'not_found', message: 'This endpoint does not exist.' },
    });
  });

  it('rejects the wrong HTTP method on /health', async () => {
    const res = await call('/health', 'POST');
    expect(res.status).toBe(404);
  });
});
