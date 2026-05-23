-- App schema + core entities (clubs, athletes, tournaments, events).

create extension if not exists pg_trgm;
create extension if not exists unaccent;

create schema if not exists thethaomammo;
grant usage on schema thethaomammo to authenticated, anon, service_role;

-- Enums
create type thethaomammo.gender as enum ('male', 'female', 'mixed');
create type thethaomammo.event_kind as enum ('singles', 'doubles');
create type thethaomammo.tournament_status as enum ('draft', 'open', 'in_progress', 'completed', 'archived');

-- Age categories (config-like, migratable in Phase 10)
create table thethaomammo.age_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_age int,
  max_age int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table thethaomammo.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  zalo_phone text,
  logo_path text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index clubs_slug_idx on thethaomammo.clubs (slug) where deleted_at is null;

create table thethaomammo.athletes (
  id uuid primary key default gen_random_uuid(),
  display_id text unique not null,
  full_name text not null,
  dob date,
  gender thethaomammo.gender,
  club_id uuid references thethaomammo.clubs(id) on delete set null,
  club_name text,
  claim_user_id uuid references auth.users(id) on delete set null,
  phone text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index athletes_full_name_idx on thethaomammo.athletes using gin (full_name gin_trgm_ops);
create index athletes_club_idx on thethaomammo.athletes (club_id) where deleted_at is null;
create index athletes_claim_user_idx on thethaomammo.athletes (claim_user_id) where deleted_at is null;

-- display_id generation: CL + YY + MM + 4-digit seq per month.
create sequence if not exists thethaomammo.athlete_display_seq;

create or replace function thethaomammo._gen_athlete_display_id()
returns trigger
language plpgsql
as $$
declare
  yymm text;
  seq int;
begin
  if new.display_id is not null then return new; end if;
  yymm := to_char(now(), 'YYMM');
  seq := nextval('thethaomammo.athlete_display_seq');
  new.display_id := 'CL' || yymm || lpad(seq::text, 4, '0');
  return new;
end;
$$;

create trigger athletes_display_id_before_insert
  before insert on thethaomammo.athletes
  for each row when (new.display_id is null)
  execute function thethaomammo._gen_athlete_display_id();

create table thethaomammo.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  status thethaomammo.tournament_status not null default 'draft',
  payment_qr_path text,
  payment_info_text text,
  zalo_group_url text,
  rules_html text,
  prize_structure jsonb,
  is_legacy boolean not null default false,
  meta jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tournaments_status_idx on thethaomammo.tournaments (status) where deleted_at is null;
create index tournaments_slug_idx on thethaomammo.tournaments (slug) where deleted_at is null;

create table thethaomammo.events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references thethaomammo.tournaments(id) on delete cascade,
  name text not null,
  kind thethaomammo.event_kind not null,
  gender thethaomammo.gender not null,
  age_category_id uuid references thethaomammo.age_categories(id) on delete set null,
  entry_fee_vnd int not null default 0,
  capacity int,
  color_code text,
  created_at timestamptz not null default now()
);

create index events_tournament_idx on thethaomammo.events (tournament_id);
