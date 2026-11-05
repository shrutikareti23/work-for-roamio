import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { ApiResult } from './api';
import { supabase as defaultClient } from './supabase';
import { normalizeEmail } from './validation';

/**
 * All sign-in related actions. Each returns ok/data or a friendly message, never throws.
 * We use 6-digit email CODES (not links) for confirming sign-up and resetting passwords:
 * codes work in Expo Go and in the store app alike, with no deep-link setup.
 */

type Client = SupabaseClient | null;

const NOT_CONFIGURED: ApiResult<never> = {
  ok: false,
  message: 'Accounts are not set up yet. Please try again later.',
};

/** Turn Supabase error codes into plain language. */
export function friendlyAuthError(error: {
  code?: string;
  message?: string;
  status?: number;
}): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'That email and password don’t match. Please try again.';
    case 'email_not_confirmed':
      return 'Please confirm your email first. We sent you a code.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try signing in.';
    case 'weak_password':
      return 'That password is too weak. Use at least 8 characters with letters and numbers.';
    case 'same_password':
      return 'Your new password must be different from the old one.';
    case 'otp_expired':
      return 'That code is wrong or has expired. Request a new one.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'email_address_not_authorized':
      return 'We can’t send email to this address yet. (Email sending isn’t fully set up.)';
    case 'email_address_invalid':
      return 'Please enter a valid email address.';
    case 'signup_disabled':
      return 'New sign-ups are paused right now.';
    case 'user_banned':
      return 'This account is suspended.';
    default:
      if (error.status === 0 || /network|fetch/i.test(error.message ?? '')) {
        return 'Can’t reach the server. Check your connection and try again.';
      }
      return 'Something went wrong. Please try again.';
  }
}

type AuthErrorLike = { code?: string; message?: string; status?: number };

async function run<R extends { data: unknown; error: AuthErrorLike | null }>(
  client: Client,
  fn: (c: SupabaseClient) => Promise<R>,
): Promise<ApiResult<R['data']>> {
  if (!client) return NOT_CONFIGURED;
  try {
    const { data, error } = await fn(client);
    if (error) return { ok: false, message: friendlyAuthError(error) };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, message: friendlyAuthError({ message: String(e), status: 0 }) };
  }
}

export function signIn(email: string, password: string, client: Client = defaultClient) {
  return run(client, (c) => c.auth.signInWithPassword({ email: normalizeEmail(email), password }));
}

/**
 * Create an account. If email confirmation is on (recommended), there's no session yet:
 * the user gets a code by email and calls verifySignUpCode.
 */
export async function signUp(
  email: string,
  password: string,
  client: Client = defaultClient,
): Promise<ApiResult<{ needsCode: boolean }>> {
  const r = await run(client, (c) => c.auth.signUp({ email: normalizeEmail(email), password }));
  if (!r.ok) return r;
  return { ok: true, data: { needsCode: r.data.session === null } };
}

export function verifySignUpCode(email: string, code: string, client: Client = defaultClient) {
  return run(client, (c) =>
    c.auth.verifyOtp({ email: normalizeEmail(email), token: code.trim(), type: 'email' }),
  );
}

export function resendSignUpCode(email: string, client: Client = defaultClient) {
  return run(client, (c) => c.auth.resend({ type: 'signup', email: normalizeEmail(email) }));
}

/** Email a password-reset code. Always "succeeds" so nobody can probe which emails exist. */
export async function sendPasswordReset(
  email: string,
  client: Client = defaultClient,
): Promise<ApiResult<null>> {
  const r = await run(client, (c) => c.auth.resetPasswordForEmail(normalizeEmail(email)));
  if (!r.ok && /Too many|reach the server|not set up/.test(r.message)) return r;
  return { ok: true, data: null };
}

/** Exchange the reset code for a temporary session, so the user can set a new password. */
export function verifyResetCode(email: string, code: string, client: Client = defaultClient) {
  return run(client, (c) =>
    c.auth.verifyOtp({ email: normalizeEmail(email), token: code.trim(), type: 'recovery' }),
  );
}

export function updatePassword(password: string, client: Client = defaultClient) {
  return run(client, (c) => c.auth.updateUser({ password }));
}

export function signOut(client: Client = defaultClient) {
  return run(client, async (c) => ({ data: null, ...(await c.auth.signOut()) }));
}

/**
 * Permanently delete the account and ALL its data (trips, days, ratings) via the
 * delete_my_account() database function, then clear the session from this phone.
 */
export async function deleteAccount(client: Client = defaultClient): Promise<ApiResult<null>> {
  const r = await run(client, async (c) => {
    const { error } = await c.rpc('delete_my_account');
    return { data: null, error };
  });
  if (!r.ok) return r;
  // The account is gone, so only clear the local copy of the session.
  await client?.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return { ok: true, data: null };
}

export async function getSession(client: Client = defaultClient): Promise<Session | null> {
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}
