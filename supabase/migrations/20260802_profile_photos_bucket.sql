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
