-- Fix: v_athletes_public was created with security_invoker=true, which re-evaluates
-- RLS on `thethaomammo.athletes` as the caller. Anon has GRANT SELECT on the table
-- but no SELECT policy, so anon queries through the view returned zero rows.
-- The view is designed to strip PII (no dob, phone, claim_user_id) and IS the
-- access control mechanism for anon — switching to definer mode bypasses RLS
-- internally on the view's SELECT while keeping the table itself locked at the
-- RLS layer for direct anon queries.
--
-- Other public views (tournaments/events/matches) keep security_invoker=true
-- because their underlying tables have explicit anon SELECT policies.

create or replace view thethaomammo.v_athletes_public
with (security_invoker = false) as
select
  a.id, a.display_id, a.full_name, a.gender, a.club_id, a.club_name,
  c.name as club_resolved_name
from thethaomammo.athletes a
left join thethaomammo.clubs c on c.id = a.club_id
where a.deleted_at is null;

grant select on thethaomammo.v_athletes_public to anon, authenticated;
