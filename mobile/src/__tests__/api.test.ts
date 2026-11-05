import { checkHealth } from '@/lib/api';

function fakeFetch(body: unknown, status = 200) {
  return jest.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

const healthy = {
  ok: true,
  service: 'roamio-worker',
  version: '0.1.0',
  time: '2026-11-05T00:00:00Z',
};

describe('checkHealth', () => {
  it('reports "not configured" when no API URL is set', async () => {
    const f = fakeFetch(healthy);
    expect(await checkHealth('', f)).toEqual({ ok: false, message: 'Server not configured yet.' });
    expect(f).not.toHaveBeenCalled();
  });

  it('returns the parsed health data on success', async () => {
    const f = fakeFetch(healthy);
    const result = await checkHealth('https://api.test', f);
    expect(f).toHaveBeenCalledWith('https://api.test/health');
    expect(result).toEqual({ ok: true, data: healthy });
  });

  it('rejects a response with the wrong shape', async () => {
    const result = await checkHealth('https://api.test', fakeFetch({ hello: 'world' }));
    expect(result).toEqual({ ok: false, message: 'Server sent an unexpected response.' });
  });

  it('reports HTTP errors', async () => {
    const result = await checkHealth('https://api.test', fakeFetch({}, 503));
    expect(result).toEqual({ ok: false, message: 'Server responded with an error (503).' });
  });

  it('gives a friendly message when the network fails', async () => {
    const f = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const result = await checkHealth('https://api.test', f);
    expect(result).toEqual({
      ok: false,
      message: "Can't reach the server. Check your connection.",
    });
  });
});
