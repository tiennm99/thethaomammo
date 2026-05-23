-- Storage buckets for tournament-asset (sponsor logos, payment QR) and gallery photos.
-- Both are public-read so the public site can serve URLs without signing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tournament-assets',
  'tournament-assets',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery',
  'gallery',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Admin-only write for both. Path prefix MUST be the tournament id so
-- objects are owned by the right tournament and stale assets are findable.

create policy "tournament_assets_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tournament-assets'
    and shared.is_admin('thethaomammo')
    and exists (
      select 1 from thethaomammo.tournaments t
      where t.id::text = (storage.foldername(name))[1]
        and t.deleted_at is null
    )
  );

create policy "tournament_assets_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'tournament-assets'
    and shared.is_admin('thethaomammo')
  );

create policy "tournament_assets_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tournament-assets'
    and shared.is_admin('thethaomammo')
  );

create policy "gallery_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gallery'
    and shared.is_admin('thethaomammo')
    and exists (
      select 1 from thethaomammo.tournaments t
      where t.id::text = (storage.foldername(name))[1]
        and t.deleted_at is null
    )
  );

create policy "gallery_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gallery'
    and shared.is_admin('thethaomammo')
  );

create policy "gallery_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gallery'
    and shared.is_admin('thethaomammo')
  );

-- Public bucket SELECTs are handled by Supabase's built-in public bucket policy;
-- no explicit storage.objects SELECT policy needed.
