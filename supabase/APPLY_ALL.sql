-- INVENTRA: consolidated schema (safe to re-run, all statements are idempotent)
-- Generated from supabase/migrations/*.sql in order. Paste this whole file into
-- Supabase Dashboard -> SQL Editor -> New query -> Run.

-- ===== migrations/20260801_init.sql =====
-- INVENTRA Supabase schema (backendless)
create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  first_name text default '',
  last_name text default '',
  email text unique not null,
  mobile text default '',
  avatar_url text default '',
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null default 'INVENTRA',
  company_logo text,
  gst_number text default '',
  dark_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  status boolean not null default true,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (created_by, name)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  status boolean not null default true,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (created_by, name)
);

create table if not exists public.distributors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  distributor_name text not null,
  gst_number text default '',
  mobile text not null,
  whatsapp text default '',
  email text default '',
  address text default '',
  city text default '',
  state text default '',
  pincode text default '',
  notes text default '',
  status boolean not null default true,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  company_name text default '',
  gst text default '',
  mobile text not null,
  email text default '',
  address text default '',
  city text default '',
  state text default '',
  notes text default '',
  status boolean not null default true,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories(id),
  brand_id uuid not null references public.brands(id),
  sku text not null,
  barcode text not null,
  qr_code text not null,
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  gst numeric(5,2) not null default 0,
  unit text not null,
  description text default '',
  status boolean not null default true,
  image_url text,
  minimum_stock integer not null default 0,
  reorder_level integer not null default 0,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (created_by, sku),
  unique (created_by, barcode),
  unique (created_by, qr_code)
);

create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  current_stock integer not null default 0,
  available_stock integer not null default 0,
  minimum_stock integer not null default 0,
  maximum_stock integer not null default 0,
  purchase_price numeric(12,2) not null default 0,
  last_updated timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (product_id, size)
);

create table if not exists public.stock_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  product_size_id uuid not null references public.product_sizes(id),
  distributor_id uuid references public.distributors(id),
  supplier_id uuid references public.suppliers(id),
  invoice_number text not null,
  quantity integer not null check (quantity > 0),
  purchase_cost numeric(12,2) not null default 0,
  transaction_type text not null check (transaction_type in ('stock_in','stock_out','adjustment','return')),
  notes text default '',
  received_date timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.stock_history (
  id uuid primary key default gen_random_uuid(),
  stock_entry_id uuid not null references public.stock_entries(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_size_id uuid not null references public.product_sizes(id),
  previous_stock integer not null,
  changed_stock integer not null,
  current_stock integer not null,
  event_type text not null,
  notes text default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.parcels (
  id uuid primary key default gen_random_uuid(),
  parcel_id text unique not null,
  tracking_number text unique not null,
  barcode text unique not null,
  qr_code text unique not null,
  distributor_id uuid references public.distributors(id),
  supplier_id uuid references public.suppliers(id),
  invoice_number text default '',
  product_id uuid not null references public.products(id),
  quantity integer not null default 1,
  dispatch_date date,
  arrival_date date,
  delivery_date date,
  current_location text default '',
  current_status text not null default 'ordered',
  assigned_person text default '',
  remarks text default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  notification_type text not null,
  is_read boolean not null default false,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  module text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_created_by on public.products(created_by);
create index if not exists idx_product_sizes_product on public.product_sizes(product_id);
create index if not exists idx_stock_entries_product on public.stock_entries(product_id);
create index if not exists idx_stock_entries_date on public.stock_entries(received_date desc);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_parcels_status on public.parcels(current_status);

create trigger set_timestamp_profiles before update on public.profiles for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_app_settings before update on public.app_settings for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_categories before update on public.categories for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_brands before update on public.brands for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_distributors before update on public.distributors for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_suppliers before update on public.suppliers for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_products before update on public.products for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_product_sizes before update on public.product_sizes for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_parcels before update on public.parcels for each row execute function public.set_current_timestamp_updated_at();
create trigger set_timestamp_notifications before update on public.notifications for each row execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_stock_entry_after_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  prev_stock integer;
  next_stock integer;
  product_name text;
  size_name text;
  owner_id uuid;
begin
  select current_stock, created_by, size into prev_stock, owner_id, size_name
  from public.product_sizes
  where id = new.product_size_id
  for update;

  if new.transaction_type = 'stock_out' then
    next_stock := prev_stock - new.quantity;
  else
    next_stock := prev_stock + new.quantity;
  end if;

  update public.product_sizes
  set current_stock = next_stock,
      available_stock = next_stock,
      last_updated = now(),
      updated_by = new.created_by
  where id = new.product_size_id;

  insert into public.stock_history(
    stock_entry_id, product_id, product_size_id, previous_stock, changed_stock, current_stock, event_type, notes, created_by
  )
  values (
    new.id,
    new.product_id,
    new.product_size_id,
    prev_stock,
    case when new.transaction_type = 'stock_out' then -new.quantity else new.quantity end,
    next_stock,
    new.transaction_type,
    new.notes,
    new.created_by
  );

  select name into product_name from public.products where id = new.product_id;

  if next_stock <= (select minimum_stock from public.product_sizes where id = new.product_size_id) then
    insert into public.notifications(title, message, notification_type, is_read, user_id)
    values (
      'Low Stock Alert',
      product_name || ' (' || size_name || ') has only ' || next_stock || ' units remaining.',
      case when next_stock <= 0 then 'out_of_stock' else 'low_stock' end,
      false,
      owner_id
    );
  end if;

  insert into public.activity_logs(user_id, module, action, metadata)
  values (
    new.created_by,
    'stock_entries',
    'insert',
    jsonb_build_object('stock_entry_id', new.id, 'transaction_type', new.transaction_type)
  );

  return new;
end;
$$;

drop trigger if exists trg_stock_entry_after_insert on public.stock_entries;
create trigger trg_stock_entry_after_insert after insert on public.stock_entries for each row execute function public.handle_stock_entry_after_insert();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles(id, username, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.distributors enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
alter table public.stock_entries enable row level security;
alter table public.stock_history enable row level security;
alter table public.parcels enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles_owner" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "settings_owner" on public.app_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_owner" on public.categories for all using (auth.uid() = created_by) with check (auth.uid() = created_by and auth.uid() = updated_by);
create policy "brands_owner" on public.brands for all using (auth.uid() = created_by) with check (auth.uid() = created_by and auth.uid() = updated_by);
create policy "distributors_owner" on public.distributors for all using (auth.uid() = created_by) with check (auth.uid() = created_by and auth.uid() = updated_by);
create policy "suppliers_owner" on public.suppliers for all using (auth.uid() = created_by) with check (auth.uid() = created_by and auth.uid() = updated_by);
create policy "products_owner" on public.products for all using (auth.uid() = created_by) with check (auth.uid() = created_by and auth.uid() = updated_by);
create policy "product_sizes_owner" on public.product_sizes for all using (auth.uid() = created_by) with check (auth.uid() = created_by and auth.uid() = updated_by);
create policy "stock_entries_owner" on public.stock_entries for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "stock_history_owner" on public.stock_history for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "parcels_owner" on public.parcels for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "notifications_owner" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_logs_owner" on public.activity_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "product_images_read" on storage.objects
for select
using (bucket_id = 'product-images');

create policy "product_images_write" on storage.objects
for insert
with check (bucket_id = 'product-images' and auth.uid() is not null);

create policy "product_images_update" on storage.objects
for update
using (bucket_id = 'product-images' and auth.uid() is not null);

create policy "product_images_delete" on storage.objects
for delete
using (bucket_id = 'product-images' and auth.uid() is not null);

create policy "profile_photos_read" on storage.objects
for select
using (bucket_id = 'profile-photos');

create policy "profile_photos_write" on storage.objects
for insert
with check (bucket_id = 'profile-photos' and auth.uid() is not null);

create policy "profile_photos_update" on storage.objects
for update
using (bucket_id = 'profile-photos' and auth.uid() is not null);

create policy "profile_photos_delete" on storage.objects
for delete
using (bucket_id = 'profile-photos' and auth.uid() is not null);

-- ===== migrations/20260802_product_optional_fields.sql =====
alter table public.products
  alter column sku drop not null,
  alter column barcode drop not null,
  alter column qr_code drop not null;

-- ===== migrations/20260802_profile_fields.sql =====
alter table public.profiles
  add column if not exists mobile text default '',
  add column if not exists avatar_url text default '';

-- ===== migrations/20260802_profile_photos_bucket.sql =====
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

drop policy if exists "profile_photos_read" on storage.objects;
drop policy if exists "profile_photos_write" on storage.objects;
drop policy if exists "profile_photos_update" on storage.objects;
drop policy if exists "profile_photos_delete" on storage.objects;

create policy "profile_photos_read" on storage.objects
for select
using (bucket_id = 'profile-photos');

create policy "profile_photos_write" on storage.objects
for insert
with check (bucket_id = 'profile-photos' and auth.uid() is not null);

create policy "profile_photos_update" on storage.objects
for update
using (bucket_id = 'profile-photos' and auth.uid() is not null);

create policy "profile_photos_delete" on storage.objects
for delete
using (bucket_id = 'profile-photos' and auth.uid() is not null);

-- ===== migrations/20260802_stock_allocation_update.sql =====
alter table public.stock_entries
  add column if not exists color text not null default '',
  add column if not exists allocated_to_type text,
  add column if not exists allocated_to text;

-- ===== migrations/20260804_enquiries.sql =====
-- INVENTRA enquiries + order history + order status schema
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  customer_name text not null,
  assigner_name text not null,
  custom_requirement text not null default '',
  combinations jsonb not null default '[]'::jsonb,
  shipping_image_url text,
  tracking_number text not null default '',
  order_status text not null default 'New',
  status_history jsonb not null default '[]'::jsonb,
  delivery_date date,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, order_id)
);

create index if not exists idx_enquiries_created_by on public.enquiries(created_by, created_at desc);
create index if not exists idx_enquiries_tracking_number on public.enquiries(tracking_number);

create or replace function public.set_enquiry_order_id()
returns trigger
language plpgsql
as $$
declare
  next_seq integer;
begin
  if new.order_id is null or new.order_id = '' then
    select coalesce(max(substring(order_id from '(\d+)$')::integer), 0) + 1
    into next_seq
    from public.enquiries
    where created_by = new.created_by;

    new.order_id := 'INV' || lpad(next_seq::text, 3, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enquiries_order_id on public.enquiries;
create trigger trg_enquiries_order_id before insert on public.enquiries for each row execute function public.set_enquiry_order_id();

drop trigger if exists set_timestamp_enquiries on public.enquiries;
create trigger set_timestamp_enquiries before update on public.enquiries for each row execute function public.set_current_timestamp_updated_at();

alter table public.enquiries enable row level security;

create policy "enquiries_owner" on public.enquiries for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by and auth.uid() = updated_by);

insert into storage.buckets (id, name, public)
values ('enquiry-images', 'enquiry-images', true)
on conflict (id) do nothing;

create policy "enquiry_images_read" on storage.objects
for select
using (bucket_id = 'enquiry-images');

create policy "enquiry_images_write" on storage.objects
for insert
with check (bucket_id = 'enquiry-images' and auth.uid() is not null);

create policy "enquiry_images_update" on storage.objects
for update
using (bucket_id = 'enquiry-images' and auth.uid() is not null);

create policy "enquiry_images_delete" on storage.objects
for delete
using (bucket_id = 'enquiry-images' and auth.uid() is not null);

-- ===== migrations/20260805_enquiries_hidden_flag.sql =====
-- Soft-hide flag for enquiries: hides a saved enquiry from the Enquiry page's
-- Saved Enquiries list and from Order History, without deleting the row.
alter table public.enquiries
  add column if not exists hidden boolean not null default false;

-- ===== migrations/20260807_enquiries_notes.sql =====
-- Free-text note/remarks field captured on the Enquiry form.
alter table public.enquiries
  add column if not exists notes text not null default '';

-- ===== migrations/20260808_enquiries_extracted_address.sql =====
-- OCR-extracted, user-editable address text from the shipping screenshot uploaded on the Enquiry form.
alter table public.enquiries
  add column if not exists extracted_address text not null default '';

