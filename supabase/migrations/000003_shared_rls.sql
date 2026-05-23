-- RLS on shared.* — deny-by-default, explicit policies per role.

alter table shared.profiles enable row level security;
alter table shared.app_grants enable row level security;

-- profiles: user reads/updates own row; any app admin can read profiles of users in their app.
create policy "profiles_select_self_or_admin"
  on shared.profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from shared.app_grants g
      where g.user_id = auth.uid()
        and g.role = 'admin'
    )
  );

create policy "profiles_update_self"
  on shared.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profiles_insert_self"
  on shared.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- app_grants: user reads own grants; admins of an app manage that app's grants.
create policy "grants_select_self_or_admin"
  on shared.app_grants
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or shared.is_admin(app_slug)
  );

create policy "grants_admin_insert"
  on shared.app_grants
  for insert
  to authenticated
  with check (shared.is_admin(app_slug));

create policy "grants_admin_update"
  on shared.app_grants
  for update
  to authenticated
  using (shared.is_admin(app_slug))
  with check (shared.is_admin(app_slug));

create policy "grants_admin_delete"
  on shared.app_grants
  for delete
  to authenticated
  using (shared.is_admin(app_slug));
