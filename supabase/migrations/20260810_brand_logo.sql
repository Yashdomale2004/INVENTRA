-- Optional brand logo, uploaded from the Management page.
alter table public.brands
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

drop policy if exists "brand_logos_read" on storage.objects;
drop policy if exists "brand_logos_write" on storage.objects;
drop policy if exists "brand_logos_update" on storage.objects;
drop policy if exists "brand_logos_delete" on storage.objects;

create policy "brand_logos_read" on storage.objects
for select
using (bucket_id = 'brand-logos');

create policy "brand_logos_write" on storage.objects
for insert
with check (bucket_id = 'brand-logos' and auth.uid() is not null);

create policy "brand_logos_update" on storage.objects
for update
using (bucket_id = 'brand-logos' and auth.uid() is not null);

create policy "brand_logos_delete" on storage.objects
for delete
using (bucket_id = 'brand-logos' and auth.uid() is not null);
