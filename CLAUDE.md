# Roamio — Project Guide

Cross-platform (iOS + Android) travel itinerary app. Expo + React Native + TypeScript
front end, one Cloudflare Worker as backend proxy, Supabase for database + auth.

## Start here (new session)

1. Read this file, then **`docs/SPEC.md`** — the owner's full original requirements
   (feature details, phase-report format). SPEC.md wins if anything here disagrees.
2. Check progress in "Phased plan" below (✅ = done) and `git log --oneline`.
3. Run `npm install` then `npm test` from the repo root to confirm a clean start.
4. Wait for the owner to say "continue" before starting the next phase.

## Current status

- **Last completed phase:** 3 (Supabase + email auth). Code done and tested locally.
- **Owner setup done:** Supabase project created (URL
  `https://hsgiqybkdrbmpagmhjku.supabase.co`, publishable key in owner's `mobile/.env`),
  migration run, Confirm email OFF, min password 8. **Sign-up verified on the phone**
  (user + auto-created profile row seen in dashboard). Owner is testing sign-out /
  sign-in / delete. Forgot-password untestable until custom SMTP exists.
- Possible later: optional "Your name" field (profiles.display_name is unused so far).
- **Next phase:** 4 (Worker data proxy). Not started; waiting for owner's "continue".
  Owner will need a free Cloudflare account.
- **In progress / uncommitted work:** none.
- **Open TODOs carried forward:**
  - Owner: glance at https://ourairports.com/data/ to confirm airport data is still
    public domain (sandbox can't reach that site).
  - Before launch (Phase 11, or earlier if owner wants): set up free custom SMTP for
    Supabase Auth (default sender only mails team members, 2/hour, and **email
    templates can't be edited without custom SMTP**). Then turn Confirm email ON and
    set the code templates from docs/setup/supabase.md. Candidates: Brevo free plan or
    Gmail SMTP with an app password — verify terms then.
  - Phase 4: Worker verifies Supabase JWTs via JWKS (asymmetric signing keys).

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
6. **Session handoff (owner's standing order): a new session must be able to pick up
   perfectly from the repo alone.** So:
   - At the **end of every phase**, before the phase report: update "Current status",
     tick the phase ✅ in "Phased plan", add an entry to "Progress log" (what was built,
     key decisions, what the owner did/set up, TODOs carried forward), update layout /
     commands / gotchas / decisions if they changed, then commit and **push** and confirm
     `git status -sb` shows `main...origin/main` with nothing ahead.
   - **During a phase**, commit + push at sensible checkpoints as
     `phase N (wip): <what>` and keep "Current status → In progress" accurate, so an
     ended session loses little.
   - Never leave important context only in chat: decisions, accounts the owner created,
     secret _names_ (never values), URLs of deployed services all go in this file.

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

| Area          | Choice                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| App           | Expo (latest SDK), React Native, TypeScript strict, Expo Router                                                         |
| Builds        | EAS Build free tier; `eas.json` with development / preview / production                                                 |
| Backend       | One Cloudflare Worker (free) + Cloudflare KV cache + daily cron                                                         |
| DB / Auth     | Supabase free: Postgres + Auth (email, Apple, Google), RLS on every table                                               |
| LLM           | Google Gemini API free tier, Flash / Flash-Lite, via Worker only                                                        |
| Places        | OpenStreetMap Overpass + Nominatim (User-Agent, heavy caching, ≤1 req/s Nominatim)                                      |
| Hours         | `opening_hours` npm library                                                                                             |
| Photos        | Wikimedia Commons / Wikipedia via OSM `wikidata` / `wikimedia_commons` tags, with attribution                           |
| Maps          | MapLibre + OpenFreeMap tiles (attribution required)                                                                     |
| Weather       | Open-Meteo forecast (≤16 days); beyond that "typical weather" from historical data, clearly labelled; CC-BY attribution |
| Flights/stays | Deep links only (Google Flights, Skyscanner, Airbnb, Booking.com) via expo-web-browser                                  |
| Airports      | OurAirports public-domain data, trimmed and bundled (city → IATA)                                                       |
| Backups       | GitHub Actions nightly `pg_dump`                                                                                        |
| Tests         | Jest (app, via jest-expo) and Vitest (Worker)                                                                           |

## Repository layout

npm workspaces monorepo (root `package.json` lists `mobile`, `worker`, `shared`, `supabase`; one
`node_modules` at the root). `@roamio/shared` is imported by both app and Worker.

```
/                         repo root
├── CLAUDE.md
├── package.json          workspaces + root scripts (lint, typecheck, test, format)
├── mobile/               Expo app (SDK 58)
│   ├── app.json          name, bundle IDs, icons, splash
│   └── src/
│       ├── app/          Expo Router screens (file name = route)
│       │   ├── _layout.tsx   root Stack + AuthProvider
│       │   ├── (tabs)/       Plan / Trips / Account tabs (NativeTabs)
│       │   └── auth/         sign-in, sign-up, verify (code), forgot-password, new-password
│       ├── components/   reusable UI (AppText, Button, Card, Screen, PlaceCard, ...)
│       ├── lib/          api client, config, supabase client, deeplinks.ts, offline cache
│       │   └── providers/ hotels.ts (pricing provider interface; launch = no prices)
│       ├── theme/        colors (light/dark), spacing, useTheme hook
│       └── __tests__/    Jest tests
├── worker/               Cloudflare Worker (wrangler.jsonc, src/index.ts)
│   ├── src/
│   │   ├── routes/       HTTP endpoints (/intake, /itinerary, /places, /account, ...)
│   │   ├── sources/      nominatim, overpass, openmeteo, wikimedia, gemini clients
│   │   ├── pipeline/     hours check, diet filter, weather swap, restaurant pick, schedule
│   │   ├── lib/          cache, rate limit, retry/backoff, auth (Supabase JWT verify)
│   │   └── data/         airports.json (generated, not Prettier-formatted)
│   └── test/             Vitest tests
├── shared/src/           zod schemas + helpers used by app and Worker (dates, geo,
│                         diet, place, weather, trip, itinerary); tests in shared/test
├── scripts/              build-airports.mjs (regenerates worker/src/data/airports.json)
├── supabase/             workspace `roamio-db`
│   ├── migrations/       SQL migrations (run in Supabase SQL Editor, in name order)
│   └── test/             PGlite (Postgres-in-WASM) RLS tests + Supabase shim
├── docs/setup/           owner setup guides (supabase.md, ...)
├── docs/                 privacy-policy.html (GitHub Pages), store checklist
└── .github/workflows/    nightly DB backup
```

## Commands (run from repo root unless noted)

- `npm install` — install everything (all workspaces)
- `npm test` / `npm run lint` / `npm run typecheck` / `npm run format`
- `cd mobile && npx expo start` — dev server for Expo Go
- `cd worker && npx wrangler dev` — run the Worker locally on :8787
- Add app packages with `cd mobile && npx expo install <pkg>` (picks SDK-compatible
  versions). In this sandbox Expo's version API is blocked by the proxy, so prefix
  with `EXPO_OFFLINE=1`.

## Gotchas

- TypeScript 6 no longer auto-loads `@types/*`; list them in `compilerOptions.types`.
- ESLint pinned to v9 (eslint-config-expo's plugins don't support v10 yet).
- Expo Go only has built-in native modules; anything else needs an EAS dev build.
- `opening_hours` is **LGPL-3.0**: keep it in the Worker only (server use isn't
  distribution). The app never bundles it; it receives precomputed hours labels.
- Opening-hours code builds Dates with the local-time constructor (wall-clock at the
  destination). Worker tests run with `TZ=Pacific/Auckland` (vitest.config.ts) to prove
  results don't depend on the server's time zone.
- Sandbox network: raw.githubusercontent.com works; ourairports.com and *.github.io are
  blocked. Airport CSV comes from the GitHub mirror (davidmegginson/ourairports-data).
- Worker ESLint is `strict`: no `!` non-null assertions in src (allowed in tests).
- Pipeline code bundles to ~313 KB gzip (free Worker limit 3 MB compressed).
- supabase.com is blocked in the sandbox; read Supabase docs from
  raw.githubusercontent.com/supabase/supabase/master/apps/docs/content/guides/...
- Supabase API keys: app uses the **publishable** key (`sb_publishable_...`); secret key
  (`sb_secret_...`) only server-side. Legacy anon/service_role still work.
- Supabase default email sender: only to project team members, **2 emails/hour**, and
  the dashboard **won't let you edit email templates until custom SMTP is set up**
  (default templates send links, not codes). So "Confirm email" is OFF until SMTP.
  App handles both: signUp() with no confirmation returns a session → no code screen.
- Auth uses 6–10 digit email **codes** (verifyOtp type `email` / `recovery`), not
  links, so no deep-link redirect setup is needed (Expo Go tunnel URLs change).
- RLS tests (`supabase/test`) take ~35 s: each test builds a fresh PGlite database.
- App jest setup (`mobile/jest.setup.ts`) mocks AsyncStorage, SecureStore, expo-crypto.

## Owner's machine (Windows, no Mac)

How the owner runs the app in Expo Go (verified working after Phase 1):

1. PowerShell: `cd ~\work-for-roamio\mobile`, then `git pull` and `npm install` when
   there are new changes.
2. `npx expo start --tunnel ngrok`, then scan the QR code (iPhone: Camera app;
   Android: scan from inside Expo Go).

Fixes already applied on the owner's PC (don't re-explain unless they come back):

- PowerShell script block → `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- LAN mode timed out (firewall/Wi-Fi) → use tunnel mode.
- `--tunnel` needs Expo CLI login; `npx expo login --sso` crashes on Windows when it
  opens the browser (cmd `start` + `&` in the URL) → logged in with
  `npx eas-cli@latest login --sso` instead (shares the same session).
- `--tunnel ngrok` said "Install @expo/ngrok and try again" even after the global
  install → install `@expo/ngrok` in the project (TODO Phase 2: add as devDependency).
- Expo Go and the CLI must be signed in to the same Expo account.
- Owner prefers short, plain step lists; avoid extra jargon and alternatives.
- `git pull` once failed because npm had changed package-lock.json locally → fix with
  `git restore package-lock.json` then `git pull`, `npm install`.
- Owner's npm is newer and blocks install scripts ("install-scripts" warnings for
  esbuild, workerd, @parcel/watcher). Not needed for the app; handle in Phase 4 if the
  owner ever runs wrangler locally (`npm install-scripts approve <pkg>`).
- Supabase dashboard "Connect" shows Next.js names (NEXT_PUBLIC_...); owner must use
  our names EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY with the same values.

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

0. **Plan** — this file + plan approval. ✅
1. **Skeleton** ✅ — Expo app (Router, TS strict, ESLint/Prettier, Jest, light/dark theme,
   tab layout with placeholder screens), Worker skeleton (`/health`, Vitest), `shared/`.
   See it in Expo Go.
2. **Core logic + tests** ✅ — pure functions with unit tests: deep links (with fallbacks),
   city→airport codes, opening-hours checks, diet intersection filter, weather swap,
   restaurant selection (open + nearby + diet), zod schemas for trips/itineraries.
3. **Supabase + email auth** ✅ — migrations (profiles, trips, itinerary days, ratings),
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
   once a place has enough ratings. Plus no-AI edits: swap a slot (backups / other
   verified places), remove or move a slot, regenerate a day with an optional note.
9. **Trip assistant chat** — ongoing chat per trip (SPEC A1): change the plan in plain
   words (targeted edits to the right day/slot, shows what changed, undo), answer
   questions using only the trip's data, remembers the conversation; per-user daily
   AI limit.
10. **Apple + Google sign-in, sharing, backups** — native sign-in (needs a development
    build via EAS), optional read-only share links, nightly GitHub Actions backup.
11. **Polish + store readiness** — accessibility and small-screen pass, error states,
    privacy policy page, app.json (bundle IDs, icons/splash placeholders, minimal
    permissions), eas.json profiles, EAS build + store submission checklist.

## Progress log

### Phase 0 — Plan ✅

- CLAUDE.md + phased plan approved. App named Roamio; app is free (no ads/IAP).
- Owner's full requirements saved verbatim in `docs/SPEC.md`.

### Phase 1 — Skeleton ✅

- npm workspaces monorepo: `mobile` (Expo SDK 58, Expo Router native tabs Plan /
  Trips / Account, light/dark theme, accessible AppText/Button/Card/Screen),
  `worker` (GET /health + JSON 404), `shared` (zod HealthResponse schema).
- Tests: 24 Jest (incl. WCAG AA color-contrast checks) + 3 Vitest, all passing;
  lint, typecheck, Prettier clean; iOS + Android bundles compile.
- Owner set up: GitHub repo `shrutikareti23/work-for-roamio` + Claude GitHub App,
  Node + Git on Windows, Expo Go on phone, Expo account (CLI login via eas-cli SSO).
- Carried forward: add `@expo/ngrok` devDependency.

### Phase 2 — Core logic + tests ✅

- `shared/src`: zod schemas for dates/times, TripProfile + Traveler (diet needs,
  allergies, restrictions with defaults), PlaceCandidate (OSM id + tags), DayWeather
  (forecast vs typical), Slot / ItineraryDay / Itinerary, ScheduleDraft (what Gemini
  must return) + `findUnknownPlaceIds` (catches invented places); haversine + walking time.
- `worker/src/pipeline`: `hours.ts` (checkVisit / hoursLabelAt: open / closed /
  "Hours unverified", public holidays, past-midnight, 24/7), `diet.ts` (group needs =
  union of all travelers; yes/limited/no/unknown; verdict confirmed / limited /
  unconfirmed / excluded; allergies never verified, always the allergen notice),
  `weather.ts` (bad-weather rules, indoor/outdoor/mixed classification, drop outdoor
  candidates on bad forecast days, swap planned outdoor slots; "typical" weather never
  swaps), `restaurants.ts` (1 main + 2 backups: open, diet-safe, unused, nearby with
  widening radius, scored; facts list for "why we picked it"), `airports.ts` (city →
  IATA with aliases, primary-airport overrides, country filter, nearest fallback).
- `mobile/src/lib/deeplinks.ts`: Google Flights (`q=` query), Skyscanner, Booking.com,
  Airbnb, directions (Apple Maps iOS / Google Maps else), reviews (Google Maps + Yelp
  search), phone (`tel:`) and website sanitizing; plain-search-page fallbacks.
- Added `@expo/ngrok` as a mobile devDependency (Phase 1 TODO done).
- Tests: 63 Jest + 88 Vitest (worker) + 11 Vitest (shared) = 162, all passing.

### Phase 3 — Supabase + email auth ✅ (owner setup pending)

- Verified Supabase free plan (from GitHub docs mirror): $0, 50k MAU, 500 MB DB, 5 GB
  egress, pauses after 1 week inactive, 2 active projects; default SMTP team-only, 2/h.
- Migration `20261105000000_initial_schema.sql`: profiles (auto-created by trigger on
  auth.users), trips (profile jsonb, dates, status), trip_days (one row per day, data
  jsonb), ratings (thumbs_up + note ≤280, one per user per place); RLS on all, anon has
  no access; `get_place_ratings(text[])` (counts only when ≥5 ratings);
  `delete_my_account()` (security definer, cascades everything).
- App: `lib/supabase.ts` (client, AppState auto-refresh), `lib/secure-storage.ts`
  (LargeSecureStore: AES key in SecureStore, ciphertext in AsyncStorage, key from
  expo-crypto), `lib/auth.ts` (sign in/up, code verify, resend, reset, update password,
  sign out, delete account; friendly error messages), `lib/session.tsx` (AuthProvider
  / useAuth), `lib/validation.ts`; components TextField, FormMessage, Button
  (loading + danger); Account tab signed-in/out states with 2-step delete confirm.
- Tests: 104 Jest + 88 worker + 11 shared + 15 RLS (PGlite) = 218, all passing.
- Owner guide: `docs/setup/supabase.md`.

## Open questions / decisions log

- App name: **Roamio** (working name). Placeholder bundle ID / package:
  `com.shrutikareti.roamio` (change before first store submission if needed).
- Plan approved by owner.
- 2026-11-05: owner wants Roamio to be a **communicative chatbot throughout** → added
  the trip assistant chat (SPEC.md A1, new Phase 9) and no-AI slot edits (Phase 8).
  Old phases 9–10 renumbered to 10–11.
- App is **free** (no ads / purchases) → Open-Meteo's non-commercial free API is OK.
  Revisit if the app is ever monetised.
- Maps: **decided — web-based** MapLibre GL JS in a WebView. Native MapLibre
  (`@maplibre/maplibre-react-native`) does not run in Expo Go. Chosen: MapLibre GL JS inside a WebView for map previews (works in Expo Go, free),
  optionally switch to native MapLibre once we use development builds.
- Apple / Google native sign-in can't be fully tested in Expo Go; tested from Phase 10
  with an EAS development build (iOS dev builds need the Apple Developer account).
- Code lives on GitHub: https://github.com/shrutikareti23/work-for-roamio (branch `main`).
  The cloud workspace is temporary, so push at the end of every phase.
- iOS `supportsTablet: false` for launch (avoids required iPad screenshots/review).
- Deep-link URL formats are public but undocumented; Google Flights `q=` passenger
  count is best-effort. Verify by tapping each button on a phone in Phase 7.
- Weather "bad day" thresholds (BAD_WEATHER_LIMITS in weather.ts): thunder, freezing
  rain, heavy snow, ≥8 mm rain (or ≥3 mm at ≥70%), ≥35°C, ≤-5°C high, ≥50 km/h wind.
- Restaurant search radius: walk 1 km, transit 3 km, car 8 km; widens ×2, ×4 if < 3 found.
- Children: sites need child ages; we pass ages only if the user gives them (no guessing).
- Account deletion uses the `delete_my_account()` database function (not the Worker +
  service key as first planned): no secret key needed, and FK cascades remove all data.
- App-wide place rating shown only when a place has ≥5 ratings (privacy + reliability).
- Password rule in app: ≥8 chars with a letter and a number (Supabase min set to 8).
