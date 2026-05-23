-- RLS: deny-by-default + explicit per-role policies using shared helpers.
-- Pattern: SELECT for public on active rows; admin writes; athlete reads own.

alter table thethaomammo.age_categories enable row level security;
alter table thethaomammo.clubs enable row level security;
alter table thethaomammo.athletes enable row level security;
alter table thethaomammo.tournaments enable row level security;
alter table thethaomammo.events enable row level security;
alter table thethaomammo.teams enable row level security;
alter table thethaomammo.registrations enable row level security;
alter table thethaomammo.registration_payments enable row level security;
alter table thethaomammo.courts enable row level security;
alter table thethaomammo.schedule_breaks enable row level security;
alter table thethaomammo.matches enable row level security;
alter table thethaomammo.match_participants enable row level security;
alter table thethaomammo.match_scores enable row level security;
alter table thethaomammo.notifications enable row level security;
alter table thethaomammo.gallery_photos enable row level security;
alter table thethaomammo.sponsors enable row level security;
alter table thethaomammo.site_settings enable row level security;
alter table thethaomammo.tournament_breaks enable row level security;

-- Generic helper macros (admin / club_manager) for brevity.
-- public_select means "anyone (anon + authenticated) can SELECT active rows".

-- age_categories: public read, admin write
create policy age_cat_public_select on thethaomammo.age_categories
  for select to anon, authenticated using (true);
create policy age_cat_admin_write on thethaomammo.age_categories
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- clubs: public read active, admin write, club_manager update own
create policy clubs_public_select on thethaomammo.clubs
  for select to anon, authenticated using (deleted_at is null);
create policy clubs_admin_write on thethaomammo.clubs
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));
create policy clubs_manager_update_own on thethaomammo.clubs
  for update to authenticated
  using (id = shared.user_scope('thethaomammo','club_manager'))
  with check (id = shared.user_scope('thethaomammo','club_manager'));

-- athletes: anon reads ONLY via v_athletes_public view (no PII columns).
-- Authenticated users see full rows; admin/claimer can write.
create policy athletes_select_authenticated on thethaomammo.athletes
  for select to authenticated using (deleted_at is null);
create policy athletes_self_update on thethaomammo.athletes
  for update to authenticated using (claim_user_id = auth.uid()) with check (claim_user_id = auth.uid());
create policy athletes_admin_write on thethaomammo.athletes
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- tournaments: public read active, admin write
create policy tournaments_public_select on thethaomammo.tournaments
  for select to anon, authenticated using (deleted_at is null);
create policy tournaments_admin_write on thethaomammo.tournaments
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- events: public read, admin write
create policy events_public_select on thethaomammo.events
  for select to anon, authenticated using (true);
create policy events_admin_write on thethaomammo.events
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- teams: public read, admin write, athlete self-update via captain
create policy teams_public_select on thethaomammo.teams
  for select to anon, authenticated using (true);
create policy teams_admin_write on thethaomammo.teams
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- registrations: athlete reads own; admin all; club_manager reads scoped
create policy registrations_self_select on thethaomammo.registrations
  for select to authenticated using (user_id = auth.uid());
create policy registrations_public_summary on thethaomammo.registrations
  for select to anon, authenticated using (deleted_at is null and status = 'confirmed');
create policy registrations_admin_write on thethaomammo.registrations
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- registration_payments: admin only
create policy registration_payments_admin on thethaomammo.registration_payments
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- courts: public read, admin write
create policy courts_public_select on thethaomammo.courts
  for select to anon, authenticated using (true);
create policy courts_admin_write on thethaomammo.courts
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- schedule_breaks: public read, admin write
create policy schedule_breaks_public_select on thethaomammo.schedule_breaks
  for select to anon, authenticated using (true);
create policy schedule_breaks_admin_write on thethaomammo.schedule_breaks
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- matches: public read, admin write, referee insert match_scores
create policy matches_public_select on thethaomammo.matches
  for select to anon, authenticated using (true);
create policy matches_admin_write on thethaomammo.matches
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

create policy match_participants_public_select on thethaomammo.match_participants
  for select to anon, authenticated using (true);
create policy match_participants_admin_write on thethaomammo.match_participants
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

create policy match_scores_public_select on thethaomammo.match_scores
  for select to anon, authenticated using (true);
create policy match_scores_referee_insert on thethaomammo.match_scores
  for insert to authenticated
  with check (shared.has_role('thethaomammo','referee') or shared.is_admin('thethaomammo'));
create policy match_scores_admin_update on thethaomammo.match_scores
  for update to authenticated
  using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- notifications: user reads own, admin all
create policy notifications_self_select on thethaomammo.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_admin on thethaomammo.notifications
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- gallery_photos: public read, admin write
create policy gallery_public_select on thethaomammo.gallery_photos
  for select to anon, authenticated using (true);
create policy gallery_admin_write on thethaomammo.gallery_photos
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- sponsors: public read, admin write
create policy sponsors_public_select on thethaomammo.sponsors
  for select to anon, authenticated using (true);
create policy sponsors_admin_write on thethaomammo.sponsors
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- site_settings: public read, admin write
create policy site_settings_public_select on thethaomammo.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_admin_write on thethaomammo.site_settings
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

-- tournament_breaks
create policy tournament_breaks_public_select on thethaomammo.tournament_breaks
  for select to anon, authenticated using (true);
create policy tournament_breaks_admin_write on thethaomammo.tournament_breaks
  for all to authenticated using (shared.is_admin('thethaomammo')) with check (shared.is_admin('thethaomammo'));

grant usage on schema thethaomammo to anon, authenticated;
grant select on all tables in schema thethaomammo to anon, authenticated;
grant insert, update, delete on all tables in schema thethaomammo to authenticated;
