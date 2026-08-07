alter table public.profiles
  add column if not exists mobile text default '',
  add column if not exists avatar_url text default '';
