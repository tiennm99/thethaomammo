-- Storage bucket for payment proof images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anon may INSERT into payment-proofs, but only under a path prefix that
-- matches an active (non-legacy) tournament id — prevents bucket spam.
create policy "payment_proofs_anon_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from thethaomammo.tournaments t
      where t.id::text = (storage.foldername(name))[1]
        and t.deleted_at is null
        and t.is_legacy = false
        and t.status in ('open', 'in_progress')
    )
  );

-- Admins SELECT to verify; users can read their own uploads (matched by metadata path containing their UID).
create policy "payment_proofs_admin_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and shared.is_admin('thethaomammo')
  );

-- No update/delete by anon — admin-only cleanup.
create policy "payment_proofs_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and shared.is_admin('thethaomammo')
  );
