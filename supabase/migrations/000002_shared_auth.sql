-- shared.profiles + shared.app_grants + RLS helpers.

create table if not exists shared.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shared.app_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_slug text not null,
  role text not null check (role in ('admin','club_manager','referee','athlete')),
  scope_id uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, app_slug, role, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create index if not exists app_grants_app_user_idx on shared.app_grants (app_slug, user_id);

-- Auto-create profile on new auth.users row.
create or replace function shared.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into shared.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function shared.handle_new_user();

-- RLS helpers. STABLE + SECURITY DEFINER w/ empty search_path so they
-- bypass RLS recursion when queried from a policy.

create or replace function shared.has_role(app text, role_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from shared.app_grants g
    where g.user_id = auth.uid()
      and g.app_slug = app
      and g.role = role_name
  );
$$;

create or replace function shared.is_admin(app text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select shared.has_role(app, 'admin');
$$;

create or replace function shared.user_scope(app text, role_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.scope_id from shared.app_grants g
  where g.user_id = auth.uid()
    and g.app_slug = app
    and g.role = role_name
  limit 1;
$$;

create or replace function shared.current_grants(app text)
returns table (role text, scope_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select g.role, g.scope_id
  from shared.app_grants g
  where g.user_id = auth.uid()
    and g.app_slug = app;
$$;

grant execute on function shared.has_role(text, text) to authenticated, anon;
grant execute on function shared.is_admin(text) to authenticated, anon;
grant execute on function shared.user_scope(text, text) to authenticated, anon;
grant execute on function shared.current_grants(text) to authenticated;
