-- Local dev seed. Run via `supabase db reset`.

insert into thethaomammo.age_categories (name, min_age, max_age, sort_order)
values
  ('U10', 0, 10, 1),
  ('U12', 10, 12, 2),
  ('U14', 12, 14, 3),
  ('U16', 14, 16, 4),
  ('Open', 16, null, 5)
on conflict do nothing;

insert into thethaomammo.clubs (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'CLB Demo', 'clb-demo')
on conflict (slug) do nothing;

insert into thethaomammo.tournaments (id, slug, name, status, venue) values
  ('00000000-0000-0000-0000-0000000000a1', 'giai-demo-2026', 'Giải demo 2026', 'open', 'NTT Demo')
on conflict (slug) do nothing;
