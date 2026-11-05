import type { SupabaseClient } from '@supabase/supabase-js';

import { getProfile, updateDisplayName } from '@/lib/profile';
import { cleanName, nameProblem } from '@/lib/validation';

/** Pretend client for `from('profiles').select(...).eq(...).maybeSingle()` and `.update(...).eq(...)`. */
function fakeClient(result: { data?: unknown; error?: unknown }) {
  type Chain = { select: jest.Mock; update: jest.Mock; eq: jest.Mock; maybeSingle: jest.Mock };
  const chain: Chain = {
    select: jest.fn((): Chain => chain),
    update: jest.fn((): Chain => chain),
    eq: jest.fn((): Chain | Promise<unknown> =>
      chain.update.mock.calls.length ? Promise.resolve(result) : chain,
    ),
    maybeSingle: jest.fn(async () => result),
  };
  const from = jest.fn(() => chain);
  return { chain, from, client: { from } as unknown as SupabaseClient };
}

describe('names', () => {
  it('tidies spaces and treats blank as no name', () => {
    expect(cleanName('  Shrutika   Reddy ')).toBe('Shrutika Reddy');
    expect(cleanName('   ')).toBeNull();
    expect(nameProblem('x'.repeat(61))).toBe('Keep it under 60 characters.');
    expect(nameProblem('')).toBeNull();
  });
});

describe('profile', () => {
  it('reads the display name', async () => {
    const f = fakeClient({ data: { id: 'u1', display_name: 'Shrutika' }, error: null });
    expect(await getProfile('u1', f.client)).toEqual({
      ok: true,
      data: { id: 'u1', displayName: 'Shrutika' },
    });
    expect(f.from).toHaveBeenCalledWith('profiles');
    expect(f.chain.eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('saves a tidied name, and blank clears it', async () => {
    const f = fakeClient({ error: null });
    expect(await updateDisplayName('u1', '  Shru  ', f.client)).toEqual({
      ok: true,
      data: { id: 'u1', displayName: 'Shru' },
    });
    expect(f.chain.update).toHaveBeenCalledWith({ display_name: 'Shru' });

    const g = fakeClient({ error: null });
    await updateDisplayName('u1', '   ', g.client);
    expect(g.chain.update).toHaveBeenCalledWith({ display_name: null });
  });

  it('returns a friendly message on errors', async () => {
    const f = fakeClient({ error: { message: 'Network request failed' } });
    expect(await updateDisplayName('u1', 'A', f.client)).toEqual({
      ok: false,
      message: 'Can’t reach the server. Check your connection and try again.',
    });
  });
});
