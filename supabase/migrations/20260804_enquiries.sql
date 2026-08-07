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
