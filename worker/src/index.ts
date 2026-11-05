import type { HealthResponse } from '@roamio/shared';

import type { Env } from './env';
import { errorJson, json } from './http';

/**
 * The Worker's entry point. Cloudflare calls `fetch` once per HTTP request,
 * a bit like a single Flask view function that routes on the URL path.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      const body: HealthResponse = {
        ok: true,
        service: 'roamio-worker',
        version: env.APP_VERSION,
        time: new Date().toISOString(),
      };
      return json(body);
    }

    return errorJson(404, 'not_found', 'This endpoint does not exist.');
  },
} satisfies ExportedHandler<Env>;
