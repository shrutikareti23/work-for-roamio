/** Small helpers for building JSON responses. */

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/** Errors always use the same shape so the app can show a friendly message. */
export function errorJson(status: number, code: string, message: string): Response {
  return json({ ok: false, error: { code, message } }, status);
}
