-- Realtime publication for live scoring + court status.
-- Drop + re-add to make idempotent.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table thethaomammo.matches;
    alter publication supabase_realtime add table thethaomammo.match_scores;
    alter publication supabase_realtime add table thethaomammo.courts;
    alter publication supabase_realtime add table thethaomammo.tournaments;
  end if;
exception when duplicate_object then
  null;
end $$;
