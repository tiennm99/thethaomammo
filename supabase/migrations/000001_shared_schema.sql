-- Shared schema for cross-app data (profiles, app_grants).
-- Concrete tables land in Phase 02.

create schema if not exists shared;

grant usage on schema shared to authenticated, anon, service_role;

-- Default privileges so future tables auto-grant correctly.
alter default privileges in schema shared
  grant select on tables to authenticated, anon;

alter default privileges in schema shared
  grant insert, update, delete on tables to authenticated;

comment on schema shared is
  'Cross-app data shared across all Vercel projects on this Supabase instance. App-specific data lives in {app_slug} schemas.';
