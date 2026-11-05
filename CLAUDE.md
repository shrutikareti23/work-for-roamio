# Roamio — Project Guide

Cross-platform (iOS + Android) travel itinerary app. Expo + React Native + TypeScript
front end, one Cloudflare Worker as backend proxy, Supabase for database + auth.

## The owner
- Knows Python and SQL, new to TypeScript / React Native.
- Explain in plain language; Python comparisons help (e.g. "zod is like pydantic",
  "a React component is like a function that returns UI", "npm is pip").
- Owner has no Mac: all native builds go through EAS Build (cloud).

## How we work
1. Build ONE phase at a time (see "Phased plan"). Never start the next phase until
   the owner says "continue".
2. End every phase with a phase report: what was built, files changed, packages
   added and why, key decisions/trade-offs, test results, how to see it (Expo Go
   steps or sample output), what the owner must do, what's next.
3. Commit at the end of each working phase with a clear message.
4. If something fails after a few honest attempts, stop and explain. Don't guess.
5. Before first use of any external API, re-check its current free terms/limits and
   report changes to the owner.

## Hard constraints
- **$0 for APIs and hosting.** Only spend: Apple Developer ($99/yr), Google Play ($25).
  No paid APIs, nothing that needs a credit card. If something can't be free, say so
  and propose a free workaround.
- **No scraping** of any website (Booking.com, Airbnb, Google, Yelp, ...).
- **No secrets in git.** Use git-ignored `.env` files, `wrangler secret put` for the
  Worker, Supabase dashboard settings, GitHub Actions secrets.
- The Gemini key lives ONLY as a Worker secret. The app never calls Gemini directly.
- The Supabase **service role** key lives ONLY in the Worker / GitHub secrets. The app
  only ever has the public **anon** key (safe because of row-level security).

## Tech stack
| Area | Choice |
|---|---|
| App | Expo (latest SDK), React Native, TypeScript strict, Expo Router |
| Builds | EAS Build free tier; `eas.json` with development / preview / production |
| Backend | One Cloudflare Worker (free) + Cloudflare KV cache + daily cron |
| DB / Auth | Supabase free: Postgres + Auth (email, Apple, Google), RLS on every table |
| LLM | Google Gemini API free tier, Flash / Flash-Lite, via Worker only |
| Places | OpenStreetMap Overpass + Nominatim (User-Agent, heavy caching, ≤1 req/s Nominatim) |
| Hours | `opening_hours` npm library |
| Photos | Wikimedia Commons / Wikipedia via OSM `wikidata` / `wikimedia_commons` tags, with attribution |
| Maps | MapLibre + OpenFreeMap tiles (attribution required) |
| Weather | Open-Meteo forecast (≤16 days); beyond that "typical weather" from historical data, clearly labelled; CC-BY attribution |
| Flights/stays | Deep links only (Google Flights, Skyscanner, Airbnb, Booking.com) via expo-web-browser |
| Airports | OurAirports public-domain data, trimmed and bundled (city → IATA) |
| Backups | GitHub Actions nightly `pg_dump` |
| Tests | Jest (app, via jest-expo) and Vitest (Worker) |

## Repository layout (target)
```
/                       repo root (this folder)
├── CLAUDE.md
├── mobile/             Expo app
│   ├── app/            Expo Router screens (file name = route, like Flask routes by file)
│   ├── components/     reusable UI (PlaceCard, RestaurantCard, ChatBubble, ...)
│   ├── lib/            app logic: api client, supabase client, deeplinks.ts, offline cache
│   │   └── providers/  hotels.ts (pricing provider interface; launch = no prices)
│   ├── theme/          colors (light/dark), spacing, typography
│   └── __tests__/
├── worker/             Cloudflare Worker (TypeScript)
│   ├── src/
│   │   ├── routes/     HTTP endpoints (/intake, /itinerary, /places, /account, ...)
│   │   ├── sources/    nominatim, overpass, openmeteo, wikimedia, gemini clients
│   │   ├── pipeline/   hours check, diet filter, weather swap, restaurant pick, schedule
│   │   └── lib/        cache, rate limit, retry/backoff, auth (Supabase JWT verify)
│   └── test/
├── shared/             types + zod schemas used by both app and Worker
├── supabase/
│   └── migrations/     SQL migrations (tables, RLS policies)
├── docs/               privacy-policy.html (GitHub Pages), store checklist
└── .github/workflows/  nightly DB backup
```

## Conventions
- TypeScript `strict: true`. No `any` unless commented why.
- ESLint + Prettier; run `npm run lint` and `npm test` before every commit.
- Validate every external/LLM response with zod (like pydantic) before using it.
- Pure logic (hours, diet, weather swap, restaurant choice, deep links) lives in plain
  functions with no network calls, so it is unit-testable.
- All network calls to third parties go through the Worker, never from the app
  (except Supabase, which the app talks to directly under RLS, and map tiles/photos).
- Every outbound request to OSM / Wikimedia / Open-Meteo sends an identifying
  `User-Agent` with a contact URL.
- Cache first: check KV before calling any third-party API.
- Retries: exponential backoff with jitter on 429 / 5xx / timeouts; user sees a
  friendly message, never a stack trace.
- The LLM never invents places: it gets a candidate list with IDs and must return
  only those IDs; anything else is rejected and retried.
- Never claim facts we don't have: unknown hours → "Hours unverified"; missing diet
  tags → "Diet unconfirmed"; every diet/allergy badge shows
  "Always confirm allergens directly with the restaurant."
- Accessibility: every touchable has `accessibilityLabel` / role; respect dark mode and
  font scaling; layouts must work at 320pt width.
- Commit messages: `phase N: <what>` plus a short body. **No "Co-Authored-By: Claude",
  session links, or other AI attribution lines** in commits or PRs (owner's request).

## Free-tier limits to design around (re-verify at time of use)
- **Cloudflare KV free: only ~1,000 writes/day** (100k reads/day). Cache whole
  bundles (e.g. one key per Overpass area query), not one key per tiny item, and use
  long TTLs.
- Cloudflare Workers free: ~100k requests/day, short CPU time per request.
- Supabase free: project pauses after ~7 days without activity (hence the cron
  keep-alive); no automatic backups on free (hence GitHub Actions).
- Gemini free tier: low requests-per-minute/day; free-tier prompts may be used by
  Google to improve products (disclose in privacy policy). Per-user rate limiting in
  the Worker protects the quota.
- Nominatim: max 1 req/s, no autocomplete-as-you-type, must cache.
- Overpass public instance: fair use, keep queries small, cache aggressively.
- Open-Meteo free API: **non-commercial use only** (OK: Roamio is free).

## Phased plan
0. **Plan** — this file + plan approval. *(done when owner approves)*
1. **Skeleton** — Expo app (Router, TS strict, ESLint/Prettier, Jest, light/dark theme,
   tab layout with placeholder screens), Worker skeleton (`/health`, Vitest), `shared/`.
   See it in Expo Go.
2. **Core logic + tests** — pure functions with unit tests: deep links (with fallbacks),
   city→airport codes, opening-hours checks, diet intersection filter, weather swap,
   restaurant selection (open + nearby + diet), zod schemas for trips/itineraries.
3. **Supabase + email auth** — migrations (profiles, trips, itinerary days, ratings),
   RLS policies, sign up / in / out / password reset in the app, secure session storage,
   in-app account deletion (via Worker with service role key). Owner creates Supabase project.
4. **Worker data proxy** — Supabase JWT verification, per-user rate limiting, KV
   caching, retry/backoff; sources: Nominatim, Overpass, Open-Meteo (forecast + typical),
   Wikimedia/Wikipedia; daily keep-alive cron. Owner creates Cloudflare account.
5. **Chat intake** — chat UI; Gemini extracts trip details into a zod-validated profile,
   asks only for missing info, shows a confirm summary. Owner creates Gemini key.
6. **Itinerary generation** — full pipeline (geocode → candidates → hours → weather
   swap → diet filter → Gemini schedule as strict JSON → validate, reject invented
   places, retry); regenerate a single day; Gemini descriptions / "why we picked it"
   using only provided facts, cached in KV.
7. **Itinerary UI** — day-by-day timeline, rich place cards, restaurant cards (1 main +
   2 backups, distance, buttons), hotel cards + `lib/providers/hotels.ts`, flight card,
   weather strip, map previews, all attributions.
8. **Trips + offline + ratings** — save / view / edit / delete trips, sync across
   devices, local offline cache, thumbs up/down ratings with notes, app rating shown
   once a place has enough ratings.
9. **Apple + Google sign-in, sharing, backups** — native sign-in (needs a development
   build via EAS), optional read-only share links, nightly GitHub Actions backup.
10. **Polish + store readiness** — accessibility and small-screen pass, error states,
    privacy policy page, app.json (bundle IDs, icons/splash placeholders, minimal
    permissions), eas.json profiles, EAS build + store submission checklist.

## Open questions / decisions log
- App name: **Roamio** (working name). Placeholder bundle ID / package:
  `com.shrutikareti.roamio` (change before first store submission if needed).
- Plan approved by owner.
- App is **free** (no ads / purchases) → Open-Meteo's non-commercial free API is OK.
  Revisit if the app is ever monetised.
- Maps: native MapLibre (`@maplibre/maplibre-react-native`) does not run in Expo Go.
  Proposed: MapLibre GL JS inside a WebView for map previews (works in Expo Go, free),
  optionally switch to native MapLibre once we use development builds.
- Apple / Google native sign-in can't be fully tested in Expo Go; tested from Phase 9
  with an EAS development build (iOS dev builds need the Apple Developer account).
- The cloud workspace is temporary: work must be pushed to a GitHub repo to survive.
