alter table public.stock_entries
  add column if not exists color text not null default '',
  add column if not exists allocated_to_type text,
  add column if not exists allocated_to text;
