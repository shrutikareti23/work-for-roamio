import type { SupabaseClient } from '@supabase/supabase-js';

import type { ApiResult } from './api';
import { friendlyAuthError } from './auth';
import { supabase as defaultClient } from './supabase';
import { cleanName } from './validation';

export type Profile = { id: string; displayName: string | null };

type Client = SupabaseClient | null;

const NOT_CONFIGURED: ApiResult<never> = {
  ok: false,
  message: 'Accounts are not set up yet. Please try again later.',
};

/** The signed-in user's profile (row-level security only returns their own row). */
export async function getProfile(
  userId: string,
  client: Client = defaultClient,
): Promise<ApiResult<Profile>> {
  if (!client) return NOT_CONFIGURED;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name')
      .eq('id', userId)
      .maybeSingle();
    if (error) return { ok: false, message: friendlyAuthError(error) };
    return { ok: true, data: { id: userId, displayName: data?.display_name ?? null } };
  } catch (e) {
    return { ok: false, message: friendlyAuthError({ message: String(e), status: 0 }) };
  }
}

/** Save a new name. An empty name clears it. */
export async function updateDisplayName(
  userId: string,
  name: string,
  client: Client = defaultClient,
): Promise<ApiResult<Profile>> {
  if (!client) return NOT_CONFIGURED;
  const displayName = cleanName(name);
  try {
    const { error } = await client
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', userId);
    if (error) return { ok: false, message: friendlyAuthError(error) };
    return { ok: true, data: { id: userId, displayName } };
  } catch (e) {
    return { ok: false, message: friendlyAuthError({ message: String(e), status: 0 }) };
  }
}
