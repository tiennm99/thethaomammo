-- Courts, matches, scoring.

create type thethaomammo.court_status as enum ('available', 'in_use', 'maintenance');
create type thethaomammo.match_status as enum ('pending', 'in_progress', 'completed', 'walkover');

create table thethaomammo.courts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references thethaomammo.tournaments(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  status thethaomammo.court_status not null default 'available',
  sponsor_id uuid,
  created_at timestamptz not null default now()
);

create index courts_tournament_idx on thethaomammo.courts (tournament_id);

create table thethaomammo.schedule_breaks (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references thethaomammo.tournaments(id) on delete cascade,
  age_category_id uuid references thethaomammo.age_categories(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create index schedule_breaks_tournament_idx on thethaomammo.schedule_breaks (tournament_id);

create table thethaomammo.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references thethaomammo.events(id) on delete cascade,
  round int not null,
  slot int not null,
  court_id uuid references thethaomammo.courts(id) on delete set null,
  scheduled_at timestamptz,
  status thethaomammo.match_status not null default 'pending',
  winner_participant_slot int,
  third_place boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create unique index matches_event_round_slot ON thethaomammo.matches (event_id, round, slot, third_place);
create index matches_court_idx on thethaomammo.matches (court_id);
create index matches_status_idx on thethaomammo.matches (status);

create table thethaomammo.match_participants (
  match_id uuid not null references thethaomammo.matches(id) on delete cascade,
  slot int not null check (slot in (1, 2)),
  athlete_id uuid references thethaomammo.athletes(id) on delete restrict,
  team_id uuid references thethaomammo.teams(id) on delete restrict,
  advanced_from_match_id uuid references thethaomammo.matches(id) on delete set null,
  primary key (match_id, slot),
  check ((athlete_id is not null) <> (team_id is not null) or (athlete_id is null and team_id is null))
);

create index match_participants_athlete_idx on thethaomammo.match_participants (athlete_id);
create index match_participants_team_idx on thethaomammo.match_participants (team_id);
create index match_participants_advanced_idx on thethaomammo.match_participants (advanced_from_match_id);

create table thethaomammo.match_scores (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references thethaomammo.matches(id) on delete cascade,
  set_no int not null check (set_no between 1 and 5),
  slot1_score int not null check (slot1_score >= 0),
  slot2_score int not null check (slot2_score >= 0),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (match_id, set_no)
);

create index match_scores_match_idx on thethaomammo.match_scores (match_id);
