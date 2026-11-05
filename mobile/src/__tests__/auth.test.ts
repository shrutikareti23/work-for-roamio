import type { SupabaseClient } from '@supabase/supabase-js';

import {
  deleteAccount,
  friendlyAuthError,
  sendPasswordReset,
  signIn,
  signUp,
  verifyResetCode,
} from '@/lib/auth';

/** A pretend Supabase client: each method resolves with whatever the test sets. */
function fakeClient() {
  const auth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    verifyOtp: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    signOut: jest.fn(async () => ({ error: null })),
  };
  const rpc = jest.fn();
  return { auth, rpc, client: { auth, rpc } as unknown as SupabaseClient };
}

const err = (code: string) => ({
  data: { user: null, session: null },
  error: { code, message: code },
});

describe('friendlyAuthError', () => {
  it.each([
    ['invalid_credentials', 'That email and password don’t match. Please try again.'],
    ['user_already_exists', 'An account with this email already exists. Try signing in.'],
    ['otp_expired', 'That code is wrong or has expired. Request a new one.'],
    ['over_email_send_rate_limit', 'Too many attempts. Please wait a few minutes and try again.'],
    ['something_new', 'Something went wrong. Please try again.'],
  ])('%s', (code, text) => expect(friendlyAuthError({ code })).toBe(text));

  it('recognises network problems', () => {
    expect(friendlyAuthError({ message: 'TypeError: Network request failed' })).toMatch(
      /Can’t reach the server/,
    );
  });
});

describe('auth actions', () => {
  it('reports "not set up" when Supabase is not configured', async () => {
    expect(await signIn('a@b.co', 'x', null)).toEqual({
      ok: false,
      message: 'Accounts are not set up yet. Please try again later.',
    });
  });

  it('signs in with a normalized email and returns friendly errors', async () => {
    const f = fakeClient();
    f.auth.signInWithPassword.mockResolvedValue(err('invalid_credentials'));
    const r = await signIn(' A@B.CO ', 'pw', f.client);
    expect(f.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' });
    expect(r).toEqual({
      ok: false,
      message: 'That email and password don’t match. Please try again.',
    });
  });

  it('sign-up asks for a code when email confirmation is on', async () => {
    const f = fakeClient();
    f.auth.signUp.mockResolvedValue({ data: { user: { id: 'u' }, session: null }, error: null });
    expect(await signUp('a@b.co', 'lisbon2026', '', f.client)).toEqual({
      ok: true,
      data: { needsCode: true },
    });
    expect(f.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'lisbon2026',
      options: undefined,
    });
  });

  it('sign-up sends the optional name, tidied, with the account', async () => {
    const f = fakeClient();
    f.auth.signUp.mockResolvedValue({ data: { user: { id: 'u' }, session: {} }, error: null });
    expect(await signUp('a@b.co', 'lisbon2026', '  Shrutika   Reddy ', f.client)).toEqual({
      ok: true,
      data: { needsCode: false },
    });
    expect(f.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'lisbon2026',
      options: { data: { display_name: 'Shrutika Reddy' } },
    });
  });

  it('password reset never reveals whether an email is registered', async () => {
    const f = fakeClient();
    f.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'user_not_found' },
    });
    expect(await sendPasswordReset('ghost@b.co', f.client)).toEqual({ ok: true, data: null });
  });

  it('password reset still reports rate limits', async () => {
    const f = fakeClient();
    f.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'over_email_send_rate_limit' },
    });
    expect((await sendPasswordReset('a@b.co', f.client)).ok).toBe(false);
  });

  it('verifies reset codes with the "recovery" type', async () => {
    const f = fakeClient();
    f.auth.verifyOtp.mockResolvedValue({ data: { user: {}, session: {} }, error: null });
    await verifyResetCode('a@b.co', ' 123456 ', f.client);
    expect(f.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'a@b.co',
      token: '123456',
      type: 'recovery',
    });
  });

  it('delete account calls the database function, then clears the local session', async () => {
    const f = fakeClient();
    f.rpc.mockResolvedValue({ data: null, error: null });
    expect(await deleteAccount(f.client)).toEqual({ ok: true, data: null });
    expect(f.rpc).toHaveBeenCalledWith('delete_my_account');
    expect(f.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('delete account keeps the session if deletion failed', async () => {
    const f = fakeClient();
    f.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await deleteAccount(f.client)).ok).toBe(false);
    expect(f.auth.signOut).not.toHaveBeenCalled();
  });
});
