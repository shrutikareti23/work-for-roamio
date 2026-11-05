# Roamio — Full Requirements (owner's original spec)

This is the owner's original request, kept word for word as the source of truth.
CLAUDE.md summarises it; when in doubt, this file wins.

## How to work with me (build in phases + explain)

- First, create a CLAUDE.md with the plan and conventions, then show me a phased plan for the whole app and WAIT for my approval.
- Build ONE phase at a time. Do not start the next phase until I say "continue".
- At the end of every phase, stop and give me a phase report:
  1. What we built in this phase, in plain language (2–5 sentences).
  2. Files created or changed, with one line on what each does.
  3. Any new packages installed and why.
  4. Key decisions you made and why (and any trade-offs).
  5. Test results (run the tests and show the summary).
  6. How to SEE the output: exact steps to open it on my phone with Expo Go, or a sample of the output (e.g. a generated itinerary JSON, an API response, a description of the screen).
  7. Anything I need to do myself (create an account, add a secret, approve something).
  8. What the next phase will do.
- Commit to Git at the end of each working phase with a clear message.
- If something fails and you can't fix it after a few tries, stop and explain the problem instead of guessing.
- Before using any external API, verify its current free terms and limits, and tell me if anything has changed.
- Never commit secrets. Use git-ignored .env files, Cloudflare Worker secrets, and Supabase environment settings.
- At the end, give me a step-by-step checklist for EAS builds and submitting to both stores.

## HARD CONSTRAINT: $0 for APIs and hosting

The only money I will spend is the Apple Developer ($99/yr) and Google Play ($25) fees. Do not use any paid API or any service that requires a credit card. If something cannot be done for free, tell me and propose a free workaround. Do NOT scrape any website (Booking.com, Airbnb, Google, Yelp, etc.).

## Tech stack (use exactly this unless you explain a strong reason to change)

- Expo (latest SDK) + React Native + TypeScript, Expo Router for navigation
- Builds via EAS Build free tier (I do not have a Mac)
- Backend: a single Cloudflare Worker (free tier) acting as a proxy, with Cloudflare KV for caching
- Database + login: Supabase free tier (Postgres + Supabase Auth). Sign-in with email (magic link or password), Sign in with Apple, and Google. Row-level security so each user can only read and write their own data. Local cache on the device so saved trips open offline.
- Keep-alive: a daily Cloudflare Worker cron job that makes a small Supabase query so the free project doesn't pause from inactivity.
- Backups: a free GitHub Actions workflow that runs a nightly database backup.
- LLM: Google Gemini API free tier (Flash or Flash-Lite model), key stored ONLY as a Worker secret, never in the app
- Places/restaurants/hotels/opening hours/diet tags: OpenStreetMap Overpass API + Nominatim geocoding (respect their usage policies: identify with a User-Agent, cache aggressively, max ~1 req/sec to Nominatim)
- Opening-hours parsing: the opening_hours npm library
- Photos: Wikimedia Commons / Wikipedia (via OSM wikidata or wikimedia_commons tags), with required attribution
- Maps/previews: MapLibre with a free tile provider whose terms allow app use (e.g. OpenFreeMap)
- Weather: Open-Meteo forecast API (no key). Forecast only covers ~16 days; for trips further out, show "typical weather" from historical averages and label it clearly. Add the required CC-BY attribution in the app.
- Flights, Airbnb, hotel booking: NO APIs. Generate prefilled deep links (Google Flights, Skyscanner, Airbnb, Booking.com) with destination, dates and guest counts. Open them with expo-web-browser.

## Features

1. Accounts: sign up, sign in, sign out, password reset. Saved trips sync across the user's devices.
2. In-app account deletion that removes the user and all their data (required by Apple).
3. Conversational intake (chat UI) that collects: destination(s), dates, origin city, number of travelers, interests per traveler, food restrictions/allergies per traveler, personal restrictions (mobility, budget, kids, pace, etc.). The bot asks follow-up questions only for missing info, then shows a summary for the user to confirm.
4. Itinerary generation, day by day, with time slots. Pipeline:
   a. Geocode destination.
   b. Fetch candidate attractions, restaurants and hotels from Overpass based on interests.
   c. For each candidate, check opening_hours against the planned date/time. Unknown hours -> mark "hours unverified".
   d. Fetch daily weather; outdoor activities on bad-weather days get swapped for indoor ones.
   e. Filter restaurants by diet tags and cuisine; anything uncertain is labeled.
   f. Send ONLY the verified candidate list + user profile to Gemini and ask it to build the schedule as strict JSON (validate with zod). The LLM must not invent places; reject and retry any place not in the candidate list.
5. Rich place cards (attractions, restaurants, cafés, hotels) instead of plain links:
   - Photo from Wikimedia/Wikipedia; if none, a category icon or small map preview. Show photo attribution.
   - Name, address, today's hours ("Open until 6 PM" / "Hours unverified"), cuisine and diet badges.
   - A one-sentence description written by Gemini using ONLY the OSM tags and Wikipedia summary provided — no invented facts.
   - A "Known for" line based on cuisine/type, phrased as a suggestion, never claiming specific menu items.
   - Small source chips linking to OSM, Wikipedia and the place's website if it has one.
   - Buttons: Directions (opens Apple/Google Maps), plus type-specific buttons below.
   - Cache photos and descriptions in Cloudflare KV so each place is only processed once.
6. Restaurant recommendations:
   - For each meal slot, pick restaurants that are open at that time, within a short walk/drive of the previous activity, and match the dietary needs of ALL travelers (intersection of restrictions). Show "diet unconfirmed" when tags are missing.
   - Card extras: distance from previous stop, a Gemini-written "why we picked it" using only provided facts, and buttons: View menu (website tag), Call (phone tag), See reviews (deep link to Google Maps / Yelp search for the place).
   - Show 1 main pick + 2 backups per meal slot.
   - Every card with a dietary or allergy badge shows: "Always confirm allergens directly with the restaurant."
7. User ratings: signed-in users can rate a place (thumbs up/down + optional short note) after a trip; store in Supabase with row-level security; show the app's own rating on cards once a place has enough ratings.
8. Stays: hotel cards from OSM (name, stars, location, photo if available) near the itinerary's center, with a "Check prices" button that deep-links to Booking.com/Airbnb with dates and guests prefilled. Put hotel pricing behind a provider interface (lib/providers/hotels.ts). For launch it returns no prices; design it so a real pricing API (e.g. Booking.com Demand API) can be added later without changing the UI.
9. Flights: a card like "Chicago (ORD) → Lisbon (LIS), Dec 10–15, 2 travelers" with buttons for Google Flights and Skyscanner (deep links). Convert city names to airport codes.
10. Put all deep-link building in lib/deeplinks.ts with unit tests and a fallback to each site's plain search page.
11. Save, view, edit, and delete trips; regenerate a single day.
12. Optional: share a trip with fellow travelers by read-only link.
13. Graceful handling of rate limits (Gemini 429s, Overpass timeouts): retries with backoff, cached results, friendly error messages.

## Production requirements

- Clean folder structure, TypeScript strict mode, ESLint + Prettier
- Unit tests for opening-hours checks, diet filtering, weather swapping, restaurant selection and deep-link building
- Worker has rate limiting per user/device to protect my free Gemini quota
- Accessible UI, dark mode, works on small phones
- A privacy policy page (static HTML I can host on GitHub Pages) that discloses: Gemini free tier data may be used by Google to improve products, what account data is stored in Supabase, how users delete their account, and third-party data sources
- App config ready for store submission: bundle IDs, icons/splash placeholders, permissions only if needed, eas.json with development/preview/production profiles

---

## Additions approved by the owner (after the original spec)

### A1. Communicative trip assistant (approved 2026-11-05)

The owner wants Roamio to be a communicative chatbot throughout, not only for intake.
Each trip has an ongoing chat ("trip assistant") where the user can:

- **Change the plan in plain words**, e.g. "make day 3 kid-friendly", "swap day 1
  dinner for something cheaper", "more relaxed pace on day 2". The assistant works out
  which day/slot to change, changes only that, and shows what changed (with undo).
- **Ask questions about the trip**, e.g. "what's the weather on day 2?", "is the museum
  open on Monday?", "which restaurant suits my vegan friend?". Answers come only from
  the trip's own data (places, hours, weather, diet tags). If it doesn't know, it says so.
- **Keep chatting naturally**: it remembers the conversation for that trip.

Also in the itinerary UI (no AI needed, instant, free):

- **Swap** a slot: restaurants → one of the 2 backups; attractions → another verified
  nearby place that is open then.
- **Remove** or **move** a slot to another day.
- **Regenerate a day** with an optional short note ("fewer museums, vegetarian lunch").

Rules: the assistant can only use verified places from our candidate lists (never
invents places or facts); every AI action counts toward a per-user daily limit in the
Worker to protect the free Gemini quota, with a friendly message when reached.
