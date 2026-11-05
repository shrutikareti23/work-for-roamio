-- Minimal imitation of the parts of a Supabase database our migrations rely on,
-- so we can test Row Level Security locally with PGlite (Postgres in WebAssembly).
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Supabase's auth.uid(): the signed-in user's id from the request's JWT.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Supabase gives anon/authenticated broad table grants by default; RLS does the real work.
alter default privileges in schema public grant all on tables to anon, authenticated;
