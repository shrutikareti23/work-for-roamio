/**
 * App configuration read from environment variables at build time.
 * Only variables starting with EXPO_PUBLIC_ are included in the app, and anything
 * in them is visible to users, so NEVER put secrets here (like a public settings.py).
 * Local values go in mobile/.env (git-ignored); see mobile/.env.example.
 */
export const config = {
  /** Base URL of the Roamio Cloudflare Worker, e.g. https://roamio-worker.<you>.workers.dev */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
};
