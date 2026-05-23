-- Registrations, teams, payments.

create type thethaomammo.registration_status as enum ('registered', 'confirmed', 'withdrew');
create type thethaomammo.payment_status as enum ('unpaid', 'pending', 'paid', 'rejected', 'unknown');

create table thethaomammo.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references thethaomammo.events(id) on delete cascade,
  name text,
  captain_athlete_id uuid references thethaomammo.athletes(id) on delete set null,
  payment_group_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index teams_event_idx on thethaomammo.teams (event_id);

create table thethaomammo.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references thethaomammo.events(id) on delete cascade,
  athlete_id uuid not null references thethaomammo.athletes(id) on delete restrict,
  team_id uuid references thethaomammo.teams(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status thethaomammo.registration_status not null default 'registered',
  payment_status thethaomammo.payment_status not null default 'unpaid',
  payment_proof_path text,
  legacy_tournament_id uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index registrations_unique_active
  on thethaomammo.registrations (event_id, athlete_id)
  where deleted_at is null;

create index registrations_event_idx on thethaomammo.registrations (event_id) where deleted_at is null;
create index registrations_athlete_idx on thethaomammo.registrations (athlete_id) where deleted_at is null;
create index registrations_user_idx on thethaomammo.registrations (user_id) where deleted_at is null;
create index registrations_payment_status_idx on thethaomammo.registrations (payment_status) where deleted_at is null;

create table thethaomammo.registration_payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references thethaomammo.registrations(id) on delete cascade,
  amount_vnd int not null,
  paid_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index registration_payments_reg_idx on thethaomammo.registration_payments (registration_id);
