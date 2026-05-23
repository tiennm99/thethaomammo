-- Public views with safe column subsets (no PII, soft-delete filtered).
-- security_invoker = true so view honors RLS of the calling user.

create or replace view thethaomammo.v_tournaments_public
with (security_invoker = true) as
select
  id, slug, name, starts_at, ends_at, venue, status,
  payment_qr_path, payment_info_text, zalo_group_url, rules_html, prize_structure,
  is_legacy
from thethaomammo.tournaments
where deleted_at is null;

create or replace view thethaomammo.v_events_public
with (security_invoker = true) as
select
  e.id, e.tournament_id, e.name, e.kind, e.gender, e.age_category_id,
  e.entry_fee_vnd, e.capacity, e.color_code,
  ac.name as age_category_name
from thethaomammo.events e
left join thethaomammo.age_categories ac on ac.id = e.age_category_id;

create or replace view thethaomammo.v_athletes_public
with (security_invoker = true) as
select
  a.id, a.display_id, a.full_name, a.gender, a.club_id, a.club_name,
  c.name as club_resolved_name
from thethaomammo.athletes a
left join thethaomammo.clubs c on c.id = a.club_id
where a.deleted_at is null;

create or replace view thethaomammo.v_matches_live
with (security_invoker = true) as
select
  m.id, m.event_id, m.round, m.slot, m.court_id, m.scheduled_at, m.status,
  m.winner_participant_slot, m.third_place,
  c.name as court_name
from thethaomammo.matches m
left join thethaomammo.courts c on c.id = m.court_id;

create or replace view thethaomammo.v_event_capacity
with (security_invoker = true) as
select
  e.id as event_id,
  e.capacity,
  count(r.id) filter (where r.status = 'confirmed') as confirmed_count,
  greatest(coalesce(e.capacity, 0) - count(r.id) filter (where r.status = 'confirmed')::int, 0) as remaining
from thethaomammo.events e
left join thethaomammo.registrations r on r.event_id = e.id and r.deleted_at is null
group by e.id, e.capacity;

grant select on
  thethaomammo.v_tournaments_public,
  thethaomammo.v_events_public,
  thethaomammo.v_athletes_public,
  thethaomammo.v_matches_live,
  thethaomammo.v_event_capacity
to anon, authenticated;
