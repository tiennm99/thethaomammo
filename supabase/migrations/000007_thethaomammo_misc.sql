-- Notifications, gallery, sponsors, settings, tournament_breaks.

create type thethaomammo.notification_type as enum (
  'registration_success',
  'payment_verified',
  'payment_rejected',
  'payment_reminder',
  'match_reminder',
  'match_result',
  'bracket_generated'
);

create type thethaomammo.notification_status as enum ('queued', 'sent', 'failed');

create type thethaomammo.sponsor_tier as enum ('gold', 'silver', 'bronze', 'partner', 'court');

create table thethaomammo.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  type thethaomammo.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  status thethaomammo.notification_status not null default 'queued',
  dedup_key text unique,
  sent_at timestamptz,
  error text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_status_idx on thethaomammo.notifications (status) where status = 'queued';
create index notifications_user_idx on thethaomammo.notifications (user_id);

create table thethaomammo.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references thethaomammo.tournaments(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index gallery_photos_tournament_idx on thethaomammo.gallery_photos (tournament_id);

create table thethaomammo.sponsors (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references thethaomammo.tournaments(id) on delete cascade,
  name text not null,
  logo_path text,
  link_url text,
  tier thethaomammo.sponsor_tier not null default 'partner',
  invert_in_light boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index sponsors_tournament_idx on thethaomammo.sponsors (tournament_id);

create table thethaomammo.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table thethaomammo.tournament_breaks (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references thethaomammo.tournaments(id) on delete cascade,
  age_category_id uuid references thethaomammo.age_categories(id) on delete set null,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index tournament_breaks_tournament_idx on thethaomammo.tournament_breaks (tournament_id);

-- Add FK back-reference once sponsors table exists.
alter table thethaomammo.courts
  add constraint courts_sponsor_fk foreign key (sponsor_id) references thethaomammo.sponsors(id) on delete set null;
