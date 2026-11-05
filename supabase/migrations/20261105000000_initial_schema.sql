-- Roamio initial schema: profiles, trips, trip days, ratings.
-- Every table has Row Level Security (RLS): a signed-in user can only read and write
-- their own rows. The app uses the public "publishable" key, so RLS is what keeps
-- each user's data private.

-- ---------- helpers ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create a profile row automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- trips ----------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  destination text not null check (char_length(destination) between 1 and 200),
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'planned')),
  -- The confirmed trip details (TripProfile in shared/src/trip.ts), validated by the app/Worker.
  profile jsonb not null default '{}'::jsonb check (pg_column_size(profile) < 32768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date <= 60)
);

create index trips_user_id_idx on public.trips (user_id);

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------- trip days (one row per day of the itinerary) ----------

create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- Copied from the trip so RLS checks stay simple and fast.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day_date date not null,
  -- The day's plan (ItineraryDay in shared/src/itinerary.ts).
  data jsonb not null check (pg_column_size(data) < 131072),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, day_date)
);

create index trip_days_trip_id_idx on public.trip_days (trip_id);
create index trip_days_user_id_idx on public.trip_days (user_id);

create trigger trip_days_updated_at
  before update on public.trip_days
  for each row execute function public.set_updated_at();

-- ---------- ratings ----------

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- OpenStreetMap id, e.g. 'node/123456'
  place_id text not null check (place_id ~ '^(node|way|relation)/[0-9]+$'),
  thumbs_up boolean not null,
  note text check (char_length(note) <= 280),
  trip_id uuid references public.trips (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index ratings_place_id_idx on public.ratings (place_id);

create trigger ratings_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.ratings enable row level security;

-- Logged-out visitors get nothing at all.
revoke all on public.profiles, public.trips, public.trip_days, public.ratings from anon;

-- (select auth.uid()) is Supabase's recommended form: evaluated once per query, not per row.

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "trips: read own" on public.trips
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "trips: create own" on public.trips
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "trips: update own" on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "trips: delete own" on public.trips
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "trip_days: read own" on public.trip_days
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "trip_days: create own" on public.trip_days
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );
create policy "trip_days: update own" on public.trip_days
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );
create policy "trip_days: delete own" on public.trip_days
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "ratings: read own" on public.ratings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ratings: create own" on public.ratings
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (trip_id is null or exists (
      select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())
    ))
  );
create policy "ratings: update own" on public.ratings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ratings: delete own" on public.ratings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- app-wide rating summary (no personal data) ----------

-- Returns thumbs up/down counts per place, but only once a place has at least
-- 5 ratings, so a single person's opinion is never shown or traceable.
create or replace function public.get_place_ratings(place_ids text[])
returns table (place_id text, thumbs_up bigint, thumbs_down bigint, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.place_id,
         count(*) filter (where r.thumbs_up),
         count(*) filter (where not r.thumbs_up),
         count(*)
  from public.ratings r
  where r.place_id = any (place_ids[1:200])
  group by r.place_id
  having count(*) >= 5;
$$;

revoke all on function public.get_place_ratings(text[]) from public, anon;
grant execute on function public.get_place_ratings(text[]) to authenticated;

-- ---------- account deletion (Apple requires in-app deletion) ----------

-- Deletes the signed-in user. Every table above references auth.users with
-- ON DELETE CASCADE, so all their profiles, trips, days and ratings go with it.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
