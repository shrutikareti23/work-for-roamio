-- Copy the optional name given at sign-up into the user's profile.
-- The app sends it as user metadata: signUp({ options: { data: { display_name } } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60), '')
  );
  return new;
end;
$$;

-- Names are trimmed; an empty name is stored as NULL.
alter table public.profiles
  add constraint profiles_display_name_trimmed
  check (display_name is null or (display_name = btrim(display_name) and display_name <> ''));
