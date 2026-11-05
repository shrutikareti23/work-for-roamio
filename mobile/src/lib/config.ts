/**
 * App configuration read from environment variables at build time.
 * Only variables starting with EXPO_PUBLIC_ are included in the app, and anything
 * in them is visible to users, so NEVER put secrets here (like a public settings.py).
 * Local values go in mobile/.env (git-ignored); see mobile/.env.example.
 */
export const config = {
  /** Base URL of the Roamio Cloudflare Worker, e.g. https://roamio-worker.<you>.workers.dev */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
  /** Supabase project URL, e.g. https://abcd1234.supabase.co */
  supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, ''),
  /**
   * Supabase PUBLISHABLE key (starts with sb_publishable_). Safe to ship in the app:
   * Row Level Security decides what it can reach. Never use the secret key here.
   */
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
};

export const isSupabaseConfigured = (): boolean =>
  /^https:\/\/.+/.test(config.supabaseUrl) && config.supabaseKey.length > 0;
